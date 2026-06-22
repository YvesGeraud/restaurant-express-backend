import { prisma } from '@/config/database.config';
import { logger } from '@/utils/logger.utils';

// ── Cache en memoria ───────────────────────────────────────────────────────────
// Map: 'GET:/api/usuarios' → 'USUARIOS_VER'
// Se carga al arrancar el servidor y se invalida cuando el admin modifica ct_ruta_permiso.
let cache = new Map<string, string>();
let intervaloRefresco: ReturnType<typeof setInterval> | null = null;

// ── Carga / refresco ───────────────────────────────────────────────────────────

/**
 * Carga (o recarga) el mapa de rutas→permisos desde la base de datos.
 * Se ejecuta al arranque y cada vez que el admin modifica la tabla.
 */
export async function cargarCacheRutaPermisos(): Promise<void> {
  const registros = await prisma.ct_ruta_permiso.findMany({
    where: { estado: true },
    include: { ct_permiso: { select: { codigo: true } } },
  });

  const nuevo = new Map<string, string>(
    registros.map((r) => [`${r.metodo}:${r.ruta}`, r.ct_permiso.codigo])
  );

  cache = nuevo;
  logger.info(`[RutaPermisoCache] ${cache.size} mapeos cargados`);
}

/**
 * Inicia el refresco automático como safety net.
 * Principal mecanismo: invalidación explícita al modificar.
 * Este intervalo cubre reinicios parciales o futuros multi-servidor.
 *
 * @param intervaloMs Milisegundos entre recargas (default: 10 min)
 */
export function iniciarRefrescoAutomatico(intervaloMs = 10 * 60 * 1_000): void {
  if (intervaloRefresco) clearInterval(intervaloRefresco);

  intervaloRefresco = setInterval(() => {
    void cargarCacheRutaPermisos();
  }, intervaloMs);

  logger.info(`[RutaPermisoCache] Refresco automático cada ${intervaloMs / 60_000} min activado`);
}

// ── Lectura ────────────────────────────────────────────────────────────────────

/**
 * Consulta el permiso requerido para una combinación método+ruta.
 * O(1) — solo lectura del Map en memoria, sin queries.
 *
 * @returns Código del permiso requerido, o `undefined` si la ruta no está registrada.
 */
export function obtenerPermisoDeRuta(metodo: string, ruta: string): string | undefined {
  return cache.get(`${metodo}:${ruta}`);
}

// ── Invalidación explícita ────────────────────────────────────────────────────

/**
 * Invalida y recarga el cache inmediatamente.
 * Debe llamarse desde el service de administración tras crear/editar/borrar mapeos.
 */
export async function invalidarCacheRutaPermisos(): Promise<void> {
  await cargarCacheRutaPermisos();
  logger.info('[RutaPermisoCache] Cache invalidado y recargado por cambio administrativo');
}
