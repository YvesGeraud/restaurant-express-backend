import bcrypt from 'bcrypt';
import { prisma } from '@/config/database.config';
import { ErrorNoAutenticado } from '@/utils/errores.utils';
import {
  generarAccessToken,
  generarRefreshToken,
  verificarRefreshToken,
  verificarAccessToken,
  hashToken,
} from '@/utils/jwt.utils';
import type { PayloadJWT, AuthTokens, UsuarioSanitizado, Permiso } from '@/types';
import type { ct_usuario } from '@prisma/client';
import { getAuditContext } from '@/utils/auth.utils';

// ── Constantes ────────────────────────────────────────────────────────────────

/** 7 días en milisegundos — debe coincidir con JWT_REFRESH_EXPIRES_IN */
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1_000;

// ── Servicio ──────────────────────────────────────────────────────────────────

class AuthService {
  // ── Login ─────────────────────────────────────────────────────────────────

  async login(
    usuario: string,
    contrasena: string,
  ): Promise<{
    usuario: UsuarioSanitizado;
    tokens: AuthTokens;
  }> {
    const encontrado = await prisma.ct_usuario.findUnique({
      where: { usuario },
      include: { ct_rol: true },
    });

    // Mismo mensaje para usuario no encontrado y contraseña incorrecta
    // → no da pistas a un atacante sobre qué campo está mal
    if (!encontrado || !encontrado.estado) {
      throw new ErrorNoAutenticado('Credenciales inválidas');
    }

    const contrasenaValida = await bcrypt.compare(contrasena, encontrado.contrasena);
    if (!contrasenaValida) {
      throw new ErrorNoAutenticado('Credenciales inválidas');
    }

    const payload: PayloadJWT = {
      id_ct_usuario: encontrado.id_ct_usuario,
      usuario: encontrado.usuario,
      email: encontrado.email,
      id_ct_rol: encontrado.id_ct_rol,
      rol: encontrado.ct_rol.nombre,
    };

    // Actualizar contexto de auditoría para que el CREATE del refresh token tenga el ID
    const context = getAuditContext();
    if (context) {
      context.id_ct_usuario = encontrado.id_ct_usuario;
    }

    const tokens = await this.emitirTokens(payload);

    return {
      usuario: this.sanitizarUsuario(encontrado),
      tokens,
    };
  }

  // ── Renovación con rotación segura ────────────────────────────────────────

  /**
   * Rota el refresh token:
   *   1. Verifica la firma JWT (detecta tokens manipulados o expirados).
   *   2. Busca el hash en BD:
   *      - No existe   → token fabricado o ya limpiado   → 401
   *      - Revocado    → reutilización detectada          → invalida toda la familia → 401
   *      - Activo      → rota: revoca el actual, emite nuevo par
   *   3. Actualiza `reemplazado_por` para trazabilidad de la cadena.
   */
  async refrescarTokens(refreshToken: string): Promise<AuthTokens> {
    // 1 — Verificar firma JWT (lanza TokenExpiredError / JsonWebTokenError si falla)
    // No usamos el payload decodificado — los datos del usuario se leen de BD (más seguro y fresco)
    verificarRefreshToken(refreshToken);

    // 2 — Buscar en BD por hash
    const hashActual = hashToken(refreshToken);
    const registro = await prisma.dt_refresh_token.findUnique({
      where: { token_hash: hashActual },
    });

    if (!registro) {
      // Token válido criptográfico pero no en BD (ya limpiado o nunca existió)
      throw new ErrorNoAutenticado('Sesión inválida. Vuelve a iniciar sesión.');
    }

    if (registro.revocado) {
      // Reutilización detectada: el token ya fue rotado pero alguien lo volvió a usar.
      // Invalida TODAS las sesiones del usuario para forzar nuevo login.
      await prisma.dt_refresh_token.updateMany({
        where: { id_ct_usuario: registro.id_ct_usuario },
        data: { revocado: true, revocado_en: new Date() },
      });
      throw new ErrorNoAutenticado(
        'Sesión inválida. Se detectó uso de credenciales antiguas. Vuelve a iniciar sesión.',
      );
    }

    // 3 — Verificar que el usuario sigue activo en BD
    const usuario = await prisma.ct_usuario.findUnique({
      where: { id_ct_usuario: registro.id_ct_usuario },
      include: { ct_rol: true },
    });

    if (!usuario || !usuario.estado) {
      throw new ErrorNoAutenticado('Sesión inválida');
    }

    // 4 — Emitir nuevo par y revocar el token actual en una transacción
    const nuevoPayload: PayloadJWT = {
      id_ct_usuario: usuario.id_ct_usuario,
      usuario: usuario.usuario,
      email: usuario.email,
      id_ct_rol: usuario.id_ct_rol,
      rol: usuario.ct_rol.nombre,
    };

    // Actualizar contexto de auditoría
    const context = getAuditContext();
    if (context) {
      context.id_ct_usuario = usuario.id_ct_usuario;
    }

    const nuevosTokens = await this.emitirTokens(nuevoPayload);

    // Revocar el token anterior y apuntar al sucesor para trazabilidad
    const nuevoHash = hashToken(nuevosTokens.refreshToken);
    const nuevoRegistro = await prisma.dt_refresh_token.findUnique({
      where: { token_hash: nuevoHash },
    });

    await prisma.dt_refresh_token.update({
      where: { id_dt_refresh_token: registro.id_dt_refresh_token },
      data: {
        revocado: true,
        revocado_en: new Date(),
        reemplazado_por: nuevoRegistro?.id_dt_refresh_token ?? null,
      },
    });

    return nuevosTokens;
  }

  // ── Logout ────────────────────────────────────────────────────────────────

  /**
   * Revoca el refresh token activo.
   * Si el token no existe en BD (ya expiró o fue limpiado) simplemente ignora.
   */
  async logout(refreshToken: string): Promise<void> {
    const hash = hashToken(refreshToken);
    await prisma.dt_refresh_token.updateMany({
      where: { token_hash: hash, revocado: false },
      data: { revocado: true, revocado_en: new Date() },
    });
  }

  // ── Me ────────────────────────────────────────────────────────────────────

  /**
   * Devuelve datos frescos del usuario para GET /api/auth/me.
   * El middleware ya verificó el token — aquí consultamos la BD
   * para devolver datos actualizados (por si cambió rol, email, etc.).
   */
  async obtenerSesionActual(id_ct_usuario: number): Promise<UsuarioSanitizado> {
    const usuario = await prisma.ct_usuario.findUnique({
      where: { id_ct_usuario },
      include: { ct_rol: true },
    });

    if (!usuario || !usuario.estado) {
      throw new ErrorNoAutenticado('Sesión expirada');
    }

    return this.sanitizarUsuario(usuario);
  }

  // ── Expuesto para el middleware de autenticación ──────────────────────────

  verificarAccessToken(token: string): PayloadJWT {
    return verificarAccessToken(token);
  }

  /**
   * Obtiene la lista de códigos de permisos activos asociados a un rol directamente de la base de datos.
   * Solo incluye relaciones con estado = true — las desactivadas se ignoran.
   */
  async obtenerPermisosPorRolId(id_ct_rol: number): Promise<Permiso[]> {
    const relaciones = await prisma.rl_rol_permiso.findMany({
      where: { id_ct_rol, estado: true },
      include: {
        ct_permiso: {
          select: { codigo: true },
        },
      },
    });

    return relaciones.map((r) => r.ct_permiso.codigo as Permiso);
  }

  // ── Privados ──────────────────────────────────────────────────────────────

  /**
   * Genera accessToken + refreshToken y persiste el hash del refresh en BD.
   * Centraliza la lógica de emisión para login y rotación.
   */
  private async emitirTokens(payload: PayloadJWT): Promise<AuthTokens> {
    const accessToken = generarAccessToken(payload);
    const refreshToken = generarRefreshToken(payload);

    await prisma.dt_refresh_token.create({
      data: {
        token_hash: hashToken(refreshToken),
        id_ct_usuario: payload.id_ct_usuario,
        expira_en: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });

    return { accessToken, refreshToken };
  }

  /** Elimina la contraseña y devuelve solo los campos seguros de identidad para el cliente. */
  private sanitizarUsuario(
    usuario: ct_usuario & { ct_rol: { nombre: string } },
  ): UsuarioSanitizado {
    return {
      id_ct_usuario: usuario.id_ct_usuario,
      usuario: usuario.usuario,
      email: usuario.email,
      nombre_completo: usuario.nombre_completo,
      id_ct_rol: usuario.id_ct_rol,
      rol: usuario.ct_rol.nombre,
    };
  }
}

export default new AuthService();
