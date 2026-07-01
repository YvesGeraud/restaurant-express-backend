import type { Request, Response } from 'express';
import authService from '@/services/auth.service';
import { responder } from '@/utils/respuestas.utils';
import { ErrorNoAutenticado } from '@/utils/errores.utils';
import { config } from '@/config/servidor.config';
import type {
  LoginDTO,
  CambiarContrasenaDTO,
  SolicitarRecuperacionDTO,
  ResetearContrasenaDTO,
} from '@/schemas/auth.schema';

// ── Opciones base de cookie ───────────────────────────────────────────────────

/**
 * Opciones compartidas entre accessToken y refreshToken.
 * httpOnly: JS del navegador NO puede leer la cookie → protege contra XSS.
 * secure:   Solo se envía por HTTPS en producción.
 * sameSite: 'strict' bloquea el envío en peticiones cross-site → protege contra CSRF.
 * path:     '/' para que aplique a toda la API.
 */
const BASE_COOKIE = {
  httpOnly: true,
  secure: config.esProduccion,
  sameSite: config.esProduccion ? ('none' as const) : ('lax' as const),
  path: '/',
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Escribe los dos tokens como cookies httpOnly en la respuesta.
 * Access token: 15 min | Refresh token: 7 días.
 */
function ponerCookies(res: Response, tokens: { accessToken: string; refreshToken: string }): void {
  res.cookie('accessToken', tokens.accessToken, {
    ...BASE_COOKIE,
    maxAge: 15 * 60 * 1_000,
  });
  res.cookie('refreshToken', tokens.refreshToken, {
    ...BASE_COOKIE,
    maxAge: 7 * 24 * 60 * 60 * 1_000,
  });
}

// ── Controller ────────────────────────────────────────────────────────────────

class AuthController {
  /**
   * POST /api/v1/auth/login
   * Verifica credenciales y emite las dos cookies con los tokens.
   * Express 5: los errores async se propagan solos — sin try/catch.
   */
  async login(req: Request, res: Response): Promise<void> {
    const { usuario, contrasena } = req.body as LoginDTO;
    const resultado = await authService.login(usuario, contrasena);

    ponerCookies(res, resultado.tokens);
    responder.ok(res, { usuario: resultado.usuario }, 'Sesión iniciada');
  }

  /**
   * POST /api/v1/auth/refresh
   * Lee el refreshToken de la cookie y emite un nuevo par de tokens.
   * No requiere autenticación previa — es el mecanismo de renovación silenciosa.
   */
  async refrescarTokens(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies['refreshToken'] as string | undefined;

    // Si no hay cookie, lanzamos ErrorNoAutenticado para que el error middleware
    // responda de forma consistente con el resto de la API.
    if (!refreshToken) throw new ErrorNoAutenticado('No hay sesión activa');

    const tokens = await authService.refrescarTokens(refreshToken);
    ponerCookies(res, tokens);
    responder.ok(res, null, 'Tokens renovados');
  }

  /**
   * GET /api/v1/auth/me
   * Devuelve datos frescos del usuario autenticado (consulta la BD).
   * El frontend usa este endpoint al recargar la página para restaurar la sesión.
   */
  async yo(req: Request, res: Response): Promise<void> {
    const usuario = await authService.obtenerSesionActual(req.usuario!.id_ct_usuario);
    responder.ok(res, { usuario });
  }

  /**
   * POST /api/auth/change-password
   * Permite al usuario autenticado cambiar su contraseña actual.
   */
  async cambiarContrasena(req: Request, res: Response): Promise<void> {
    const { contrasena_actual, contrasena_nueva } = req.body as CambiarContrasenaDTO;
    await authService.cambiarContrasena(req.usuario!.id_ct_usuario, contrasena_actual, contrasena_nueva);

    res.clearCookie('accessToken', BASE_COOKIE);
    res.clearCookie('refreshToken', BASE_COOKIE);
    responder.ok(res, null, 'Contraseña actualizada. Por seguridad, inicia sesión nuevamente.');
  }

  /**
   * POST /api/auth/forgot-password
   * Envía el email de recuperación (siempre responde OK para no revelar si el email existe).
   */
  async solicitarRecuperacion(req: Request, res: Response): Promise<void> {
    const { email } = req.body as SolicitarRecuperacionDTO;
    await authService.solicitarRecuperacion(email);
    responder.ok(res, null, 'Si existe una cuenta con ese email, recibirás instrucciones para restablecer tu contraseña.');
  }

  /**
   * POST /api/auth/reset-password
   * Verifica el token de recuperación y actualiza la contraseña.
   */
  async resetearContrasena(req: Request, res: Response): Promise<void> {
    const { token, contrasena_nueva } = req.body as ResetearContrasenaDTO;
    await authService.resetearContrasena(token, contrasena_nueva);
    responder.ok(res, null, 'Contraseña restablecida exitosamente. Ya puedes iniciar sesión.');
  }

  /**
   * POST /api/auth/logout
   * Revoca el refreshToken en BD y limpia las dos cookies del cliente.
   * Importante: pasar las mismas opciones que al setear para que el navegador
   * reconozca la cookie y la elimine correctamente.
   * Es async porque revocamos en BD antes de responder.
   */
  async logout(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies['refreshToken'] as string | undefined;

    // Revocar en BD aunque la cookie exista o no — operación idempotente
    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    res.clearCookie('accessToken', BASE_COOKIE);
    res.clearCookie('refreshToken', BASE_COOKIE);
    responder.ok(res, null, 'Sesión cerrada exitosamente');
  }
}

export default new AuthController();
