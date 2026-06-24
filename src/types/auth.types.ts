/**
 * Código de un permiso en el sistema (ej: 'USUARIOS_VER', 'PLATILLOS_CREAR').
 * Era keyof typeof PERMISOS cuando los permisos eran constantes.
 * Ahora es `string` porque los permisos se gestionan dinámicamente en BD (ct_permiso).
 */
export type Permiso = string;

/**
 * Datos del usuario disponibles en req.usuario después de validar el JWT.
 * Solo incluye lo mínimo para autenticación y autorización — nunca la contraseña.
 */
export interface UsuarioAutenticado {
  id_ct_usuario: number;
  usuario: string;
  email: string | null;
  id_ct_rol: number;
  rol: string; // Nombre del rol extraído de la BD
  permisos: Permiso[]; // Lista de permisos activos para el rol
}


/**
 * Payload firmado dentro del JWT (access y refresh token).
 * Se mantiene mínimo — datos que rara vez cambian y son necesarios en cada request.
 */
export interface PayloadJWT {
  id_ct_usuario: number;
  usuario: string;
  email: string | null;
  id_ct_rol: number;
  rol: string;
}

/**
 * Datos del usuario después de eliminar campos sensibles como contraseñas.
 * Se usa para devolver la información del usuario logueado al frontend.
 *
 * IMPORTANTE: No incluye permisos. La autorización es responsabilidad exclusiva
 * del backend (middleware `autorizar` + cache de rutas). El frontend solo recibe
 * identidad — nunca el mapa de capacidades del rol.
 */
export interface UsuarioSanitizado {
  id_ct_usuario: number;
  usuario: string;
  email: string | null;
  nombre_completo: string;
  id_ct_rol: number;
  rol: string;
}

/**
 * Par de tokens (Acceso + Refresh) emitidos por el servidor después de autenticar.
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ── Augmentación de Express ───────────────────────────────────────────────────
/* eslint-disable @typescript-eslint/no-namespace */

declare global {
  namespace Express {
    interface Request {
      /**
       * Disponible solo en rutas protegidas, después del middleware de autenticación.
       */
      usuario?: UsuarioAutenticado;
    }
  }
}
