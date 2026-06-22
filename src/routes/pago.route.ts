import { Router } from 'express';
import express from 'express';
import pagoController from '@/controllers/pago.controller';
import { autenticado } from '@/middlewares/autenticacion.middleware';
import { autorizar } from '@/middlewares/autorizacion.middleware';
import { validar } from '@/middlewares/validar.middlewares';
import { iniciarPagoSchema, cancelarReservacionSchema } from '@/schemas/pago.schema';
import { idParamSchema } from '@/schemas/comun.schema';


// ── Router de webhooks (sin autenticación JWT) ─────────────────────────────
// Este router se monta en /api/webhooks — Stripe hace POST directamente aquí.
//
// CRÍTICO: La ruta del webhook usa express.raw() para recibir el body como Buffer.
// Si usara express.json(), el body ya estaría parseado y la verificación de firma
// de Stripe fallaría porque el hash se calcula sobre el payload crudo (sin parsear).
//
// Por eso este router NO puede usar el middleware global de express.json().
const webhookRouter = Router();

/**
 * @route   POST /api/webhooks/stripe
 * @desc    Recibe eventos de Stripe (payment_intent.succeeded, etc.)
 * @access  Público (autenticación por firma HMAC, no por JWT)
 */
webhookRouter.post(
  '/stripe',
  // express.raw() = preserva el body como Buffer sin parsear
  express.raw({ type: 'application/json' }),
  pagoController.manejarWebhook,
);

// ── Router de pagos (rutas autenticadas) ───────────────────────────────────
// Estas rutas son para que el admin/staff gestione pagos desde el sistema.
const pagoRouter = Router();

// Rutas públicas y protegidas de gestión de pagos

/**
 * @route   POST /api/reservaciones/:id/pago
 * @desc    Inicia el proceso de pago — crea PaymentIntent en Stripe
 * @access  Requiere permiso RESERVACIONES_CREAR
 */
pagoRouter.post(
  '/:id/pago',
  // Público: cualquier persona con el ID de su reservación puede iniciar el pago
  validar(iniciarPagoSchema),
  pagoController.iniciarPago,
);

/**
 * @route   POST /api/reservaciones/:id/cancelar
 * @desc    Cancela la reservación aplicando política de cancelación
 * @access  Requiere permiso RESERVACIONES_EDITAR
 */
pagoRouter.post(
  '/:id/cancelar',
  autenticado,
  autorizar,
  validar(cancelarReservacionSchema),
  pagoController.cancelar,
);

/**
 * @route   PATCH /api/reservaciones/:id/completar
 * @desc    Marca la reservación como completada (cliente asistió) → libera autorización
 * @access  Requiere permiso RESERVACIONES_EDITAR
 */
pagoRouter.patch(
  '/:id/completar',
  autenticado,
  autorizar,
  validar(idParamSchema),
  pagoController.completar,
);

export { webhookRouter, pagoRouter };
