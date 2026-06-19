import { Request, Response, NextFunction } from 'express';
import { ErrorNoAutorizado } from '@/utils/errores.utils';
import { obtenerPermisoDeRuta } from '@/utils/ruta-permiso.cache';
import { logger } from '@/utils/logger.utils';

/**
 * Middleware de autorización dinámica (Nivel 3).
 *
 * Consulta el cache en memoria para determinar qué permiso requiere la ruta actual.
 * No tiene strings hardcodeados — el mapeo vive en la tabla `ct_ruta_permiso` de BD.
 *
 * Normalización de rutas con parámetros:
 *   PATCH /api/platillos/42  →  busca 'PATCH:/api/platillos'
 *   DELETE /api/usuarios/5   →  busca 'DELETE:/api/usuarios'
 *
 * Política de seguridad: si la ruta no está registrada en BD → denegar por defecto.
 * El `logger.warn` indica exactamente qué ruta falta en la tabla para facilitar debug.
 *
 * @example
 * router.post('/', autenticado, autorizar, controller.crear);
 * router.delete('/:id', autenticado, autorizar, controller.eliminar);
 */
export const autorizar = (req: Request, _res: Response, next: NextFunction): void => {
  const metodo = req.method;

  // Normaliza segmentos numéricos (/42, /123) para hacer el lookup en la tabla.
  // Cubre rutas del tipo /:id y /:id/subrecurso.
  const rutaNormalizada = req.baseUrl.replace(/\/\d+/g, '');

  const permisoRequerido = obtenerPermisoDeRuta(metodo, rutaNormalizada);

  // Ruta no registrada → denegar. Se loguea para facilitar debug en desarrollo.
  if (!permisoRequerido) {
    logger.warn(
      `[autorizar] Ruta no registrada en ct_ruta_permiso: ${metodo} ${rutaNormalizada} ` +
      `(original: ${req.method} ${req.originalUrl})`
    );
    next(new ErrorNoAutorizado(`Acceso denegado: ruta sin permiso configurado`));
    return;
  }

  if (!req.usuario?.permisos?.includes(permisoRequerido)) {
    next(new ErrorNoAutorizado(`No tienes el permiso necesario: ${permisoRequerido}`));
    return;
  }

  next();
};
