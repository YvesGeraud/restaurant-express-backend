import type { Request } from 'express';
import { prisma } from '@/config/database.config';
import authService from '@/services/auth.service';
import type { UsuarioAutenticado } from '@/types/auth.types';
import { crearLoaders, type Loaders } from '@/graphql/loaders';

/**
 * Tipo del contexto GraphQL disponible en todos los resolvers.
 * Se crea una nueva instancia por request (HTTP) o por conexión (WebSocket).
 */
export interface GraphQLContext {
  /** Instancia de Prisma con extensión de auditoría */
  prisma: typeof prisma;
  /** DataLoaders — nuevos por request para evitar caché entre peticiones distintas */
  loaders: Loaders;
  /** Usuario autenticado, null si la petición no lleva cookie válida */
  usuario: UsuarioAutenticado | null;
}

/**
 * Contexto para peticiones HTTP (queries y mutations).
 * Lee el accessToken de la cookie httpOnly, igual que el middleware REST.
 */
export async function crearContextoHttp({
  req,
}: {
  req: Request;
}): Promise<GraphQLContext> {
  const token = req.cookies['accessToken'] as string | undefined;
  let usuario: UsuarioAutenticado | null = null;

  if (token) {
    try {
      const payload = authService.verificarAccessToken(token);
      const permisos = await authService.obtenerPermisosPorRolId(payload.id_ct_rol);
      usuario = {
        id_ct_usuario: payload.id_ct_usuario,
        usuario: payload.usuario,
        email: payload.email,
        id_ct_rol: payload.id_ct_rol,
        rol: payload.rol,
        permisos,
      };
    } catch {
      // Token inválido o expirado → usuario null
      // El resolver decide si lanzar error (campos protegidos) o devolver null (campos públicos)
    }
  }

  return {
    prisma,
    loaders: crearLoaders(),
    usuario,
  };
}

/**
 * Contexto para conexiones WebSocket (subscriptions).
 * El connectionParams puede traer el token si se decide enviar por WS,
 * pero por ahora se deja anonymous — las subscriptions de órdenes no requieren auth.
 */
export async function crearContextoWs(): Promise<GraphQLContext> {
  return {
    prisma,
    loaders: crearLoaders(),
    usuario: null,
  };
}

// ── Helper para resolvers protegidos ─────────────────────────────────────────

import { GraphQLError } from 'graphql';

/**
 * Lanza GraphQLError si el usuario no está autenticado.
 * Usar en cualquier resolver que requiera sesión activa.
 *
 * @example
 * const usuario = requireAuth(ctx);
 * // → garantiza que usuario no es null aquí abajo
 */
export function requireAuth(ctx: GraphQLContext): UsuarioAutenticado {
  if (!ctx.usuario) {
    throw new GraphQLError('No autenticado. Se requiere sesión activa.', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return ctx.usuario;
}

/**
 * Lanza GraphQLError si el usuario no tiene el rol requerido.
 */
export function requireRol(ctx: GraphQLContext, ...roles: string[]): UsuarioAutenticado {
  const usuario = requireAuth(ctx);
  if (!roles.includes(usuario.rol)) {
    throw new GraphQLError(`Acceso denegado. Se requiere uno de: ${roles.join(', ')}`, {
      extensions: { code: 'FORBIDDEN' },
    });
  }
  return usuario;
}
