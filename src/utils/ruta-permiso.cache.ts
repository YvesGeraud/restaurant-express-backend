import { prisma } from '@/config/database.config';
import { logger } from '@/utils/logger.utils';
import type { Permiso } from '@/types';

// ── Limitación de despliegue multi-instancia ──────────────────────────────────
//
// Este cache es puramente en memoria (process heap). En un despliegue con una
// sola instancia funciona perfecto: al arrancar se carga desde BD, se refresca
// cada 10 min y se invalida explícitamente cuando el admin modifica permisos.
//
// ⚠ Con múltiples pods (Kubernetes, PM2 cluster) cada instancia mantiene su
// propio Map independiente. Si el admin edita permisos, solo el pod que recibió
// la petición invalida su cache; los demás sirven datos obsoletos hasta el
// siguiente refresco automático (≤10 min).
//
// Solución para escala horizontal: sustituir ambos Maps por Redis + pub/sub.
// Al invalidar, publicar en un canal 'cache:permisos:invalidar'; todos los pods
// suscritos recargan de BD al instante, manteniendo coherencia global.
// Referencia de patrón: https://redis.io/docs/manual/pubsub/
//
// ── Cache de rutas → permisos ──────────────────────────────────────────────────
// Map: 'GET:/api/usuarios' → 'USUARIOS_VER'
let cache = new Map<string, string>();

// ── Cache de roles → permisos ─────────────────────────────────────────────────
// Map: id_ct_rol → ['USUARIOS_VER', 'CLIENTES_VER', ...]
// Elimina el findMany a rl_rol_permiso en cada request autenticada.
let cachePermisos = new Map<number, Permiso[]>();

let intervaloRefresco: ReturnType<typeof setInterval> | null = null;

// ── Carga / refresco ───────────────────────────────────────────────────────────

/**
 * Carga (o recarga) el mapa de rutas→permisos desde la base de datos.
 * También recarga el mapa rol→permisos.
 * Se ejecuta al arranque y cada vez que el admin modifica la tabla.
 */
export async function cargarCacheRutaPermisos(): Promise<void> {
  const [registrosRutas, registrosRoles] = await Promise.all([
    prisma.ct_ruta_permiso.findMany({
      where: { estado: true },
      include: { ct_permiso: { select: { codigo: true } } },
    }),
    prisma.rl_rol_permiso.findMany({
      where: { estado: true },
      select: { id_ct_rol: true, ct_permiso: { select: { codigo: true } } },
    }),
  ]);

  const nuevoRutas = new Map<string, string>(
    registrosRutas.map((r) => [`${r.metodo}:${r.ruta}`, r.ct_permiso.codigo])
  );

  // Agrupar permisos por rol
  const nuevoPermisos = new Map<number, Permiso[]>();
  for (const rel of registrosRoles) {
    const lista = nuevoPermisos.get(rel.id_ct_rol) ?? [];
    lista.push(rel.ct_permiso.codigo as Permiso);
    nuevoPermisos.set(rel.id_ct_rol, lista);
  }

  cache = nuevoRutas;
  cachePermisos = nuevoPermisos;

  logger.info(
    `[RutaPermisoCache] ${cache.size} rutas y ${cachePermisos.size} roles cargados`
  );
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

/**
 * Devuelve la lista de permisos activos para un rol desde cache.
 * O(1) — sin queries a BD.
 *
 * @returns Lista de permisos, o `undefined` si el rol no está en cache (first-miss).
 */
export function obtenerPermisosDeRol(id_ct_rol: number): Permiso[] | undefined {
  return cachePermisos.get(id_ct_rol);
}

// ── Invalidación explícita ────────────────────────────────────────────────────

/**
 * Invalida y recarga ambos caches inmediatamente.
 * Debe llamarse tras crear/editar/borrar mapeos de rutas o permisos de rol.
 */
export async function invalidarCacheRutaPermisos(): Promise<void> {
  await cargarCacheRutaPermisos();
  logger.info('[RutaPermisoCache] Cache invalidado y recargado por cambio administrativo');
}
