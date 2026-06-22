// dotenv debe cargarse PRIMERO — antes de cualquier import que lea process.env
import 'dotenv/config';

import app, { inicializarApollo, getApolloServer } from '@/setup';
import { config } from '@/config/servidor.config';
import { prisma } from '@/config/database.config';
import { limpiarTokensExpirados } from '@/jobs/tokens.job';
import { procesarNoShows } from '@/jobs/noshow.job';
import { cargarCacheRutaPermisos, iniciarRefrescoAutomatico } from '@/utils/ruta-permiso.cache';

// ── GraphQL WebSocket server (Subscriptions) ──────────────────────────────────
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';
import { cargarSchema } from '@/graphql/apollo';
import { crearContextoWs } from '@/graphql/context';

// ── Iniciar servidor ──────────────────────────────────────────────────────────

void (async () => {
  // 1. Apollo Server debe arrancar ANTES de que Express empiece a escuchar
  await inicializarApollo();

  const servidor = app.listen(config.puerto, async () => {
    console.log(
      `\n    ╔════════════════════════════════════════════╗` +
        `\n    ║  🍽️  RESTAURANTE API                        ║` +
        `\n    ║  🚀 http://localhost:${config.puerto}                  ║` +
        `\n    ║  🌍 Entorno: ${config.nodeEnv.toUpperCase().padEnd(30)}║` +
        `\n    ╚════════════════════════════════════════════╝\n`,
    );

    // 2. WebSocket server para GraphQL Subscriptions
    // Usa el mismo servidor HTTP (mismo puerto) — graphql-ws distingue el protocolo.
    const schema = await cargarSchema();
    const wsServer = new WebSocketServer({ server: servidor, path: '/graphql' });
    const wsCleanup = useServer({ schema, context: crearContextoWs }, wsServer);

    console.log(`\n    🔌 WebSocket (Subscriptions): ws://localhost:${config.puerto}/graphql`);

    // Guardar referencia para cerrar limpiamente en shutdown
    (global as Record<string, unknown>)['wsCleanup'] = wsCleanup;
    (global as Record<string, unknown>)['servidor'] = servidor;

    // ── Cache de autorización dinámica ────────────────────────────────────────
    // Carga el mapa ruta→permiso en memoria y activa el refresco automático (10 min)
    // como safety net. La invalidación principal ocurre al modificar ct_ruta_permiso.
    void cargarCacheRutaPermisos();
    iniciarRefrescoAutomatico();

    // ── Jobs de fondo ─────────────────────────────────────────────────────────
    // Se registran DESPUÉS de que el servidor arranca para no bloquear el inicio.
    // Se ejecutan inmediatamente una vez al arrancar (para recuperar trabajo
    // pendiente de reinicios del servidor) y luego en intervalos periódicos.

    // Limpieza de tokens expirados — cada 24 horas
    void limpiarTokensExpirados();
    setInterval(() => void limpiarTokensExpirados(), 24 * 60 * 60 * 1_000);

    // Procesamiento de no-shows — cada hora
    // Reservaciones CONFIRMADAS cuya fecha ya pasó se marcan como NO_SHOW
    // y se captura el cargo de penalización en Stripe.
    void procesarNoShows();
    setInterval(() => void procesarNoShows(), 60 * 60 * 1_000);
  });

  // ── Manejo de errores de red y arranque ──────────────────────────────────────

  servidor.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(
        `\n❌ Error FATAL: El puerto ${config.puerto} ya está siendo usado por otro proceso.`,
      );
      console.error('   Sugerencia: Termina el proceso anterior o cambia el PORT en el .env');
    } else {
      console.error('\n❌ Error al iniciar el servidor:', error);
    }
    process.exit(1);
  });

  // Capturar errores no manejados para que no muera en silencio
  process.on('unhandledRejection', (reason) => {
    console.error('\n⚠️ RECHAZO NO MANEJADO (Promise):', reason);
  });

  process.on('uncaughtException', (error) => {
    console.error('\n❌ EXCEPCIÓN NO CAPTURADA:', error);
    process.exit(1);
  });

  // ── Cierre limpio ─────────────────────────────────────────────────────────────

  // El ciclo de vida del proceso pertenece al punto de entrada, no a setup.ts,
  // para que los tests puedan importar app sin arrancar ni cerrar servidores.
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n[${signal}] Cerrando servidor...`);

    // Seguro de vida: forzar salida si tarda demasiado (vital en Linux para liberar puertos)
    const forceExit = setTimeout(() => {
      console.error('⚠️ El servidor tardó demasiado en cerrar. Forzando salida para liberar el puerto...');
      process.exit(1);
    }, 3000);

    // 1. Cerrar conexiones WebSocket de Subscriptions
    const wsCleanup = (global as Record<string, unknown>)['wsCleanup'] as
      | { dispose: () => Promise<void> }
      | undefined;
    if (wsCleanup) await wsCleanup.dispose();

    // 2. Detener Apollo Server (HTTP queries/mutations)
    const apolloServer = getApolloServer();
    if (apolloServer) await apolloServer.stop();

    // 3. Cerrar servidor HTTP (deja de aceptar nuevas peticiones)
    servidor.close(async () => {
      clearTimeout(forceExit);
      try {
        // 4. Desconectar DB
        await prisma.$disconnect();
        console.log('✅ Conexiones cerradas. Proceso terminado.');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error al cerrar conexiones:', error);
        process.exit(1);
      }
    });
  };

  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
})();
