import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import authController from '@/controllers/auth.controller';
import { autenticado } from '@/middlewares/autenticacion.middleware';
import { validar } from '@/middlewares/validar.middlewares';
import {
  loginSchema,
  cambiarContrasenaSchema,
  solicitarRecuperacionSchema,
  resetearContrasenaSchema,
} from '@/schemas/auth.schema';

const router = Router();

// Limiter estricto para forgot-password: 5 intentos / 15 min por IP
// Evita que se abuse para enviar spam de emails de recuperación.
const limitarRecuperacion = rateLimit({
  windowMs: 15 * 60 * 1_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    exito: false,
    mensaje: 'Demasiadas solicitudes de recuperación. Intenta de nuevo en 15 minutos.',
    codigo: 'TOO_MANY_REQUESTS',
  },
});

// ── Públicas (sin autenticación) ──────────────────────────────────────────────

// El rate limiting estricto se aplica en setup.ts al montar este router
router.post('/login', validar(loginSchema), authController.login);
router.post('/refresh', authController.refrescarTokens);

// Recuperación de contraseña (rate limiting especial para forgot-password)
router.post('/forgot-password', limitarRecuperacion, validar(solicitarRecuperacionSchema), authController.solicitarRecuperacion);
router.post('/reset-password', validar(resetearContrasenaSchema), authController.resetearContrasena);

// ── Protegidas (requieren cookie accessToken válida) ──────────────────────────

router.post('/change-password', autenticado, validar(cambiarContrasenaSchema), authController.cambiarContrasena);
router.post('/logout', autenticado, authController.logout);
router.get('/me', autenticado, authController.yo);

export { router as authRouter };
