import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('@/utils/ruta-permiso.cache', () => ({
  obtenerPermisoDeRuta: (metodo: string, ruta: string) => {
    const mapa: Record<string, string> = {
      'POST:/api/reservaciones':  'RESERVACIONES_EDITAR',
      'PATCH:/api/reservaciones': 'RESERVACIONES_EDITAR',
    };
    return mapa[`${metodo}:${ruta}`];
  },
  cargarCacheRutaPermisos:    () => Promise.resolve(),
  iniciarRefrescoAutomatico:  () => {},
  invalidarCacheRutaPermisos: () => Promise.resolve(),
  obtenerPermisosDeRol:       () => undefined,
}));

vi.mock('@/config/database.config', () => ({
  prisma: {
    rl_rol_permiso: { findMany: vi.fn() },
    $queryRaw: vi.fn().mockResolvedValue([{ db_health_check: 1 }]),
  },
}));

vi.mock('@/services/pago.service', () => ({
  default: {
    iniciarPagoPorReservacion: vi.fn(),
    confirmarPagoWebhook:      vi.fn(),
    cancelarReservacion:       vi.fn(),
    completarReservacion:      vi.fn(),
    procesarNoShow:            vi.fn(),
  },
}));

vi.mock('@/services/stripe.service', () => ({
  default: {
    construirEvento:     vi.fn(),
    crearIntentoPago:    vi.fn(),
    capturarPago:        vi.fn(),
    cancelarIntentoPago: vi.fn(),
  },
}));

import app from '@/setup';
import { prisma } from '@/config/database.config';
import pagoService from '@/services/pago.service';
import stripeService from '@/services/stripe.service';
import { TODOS_LOS_PERMISOS, getAuthCookie } from '../helpers/permisos.fixture';

describe('Módulo de Pagos — Rutas de Integración', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.rl_rol_permiso.findMany).mockResolvedValue(TODOS_LOS_PERMISOS as any);
  });

  // ── Webhook de Stripe ─────────────────────────────────────────────────────

  describe('POST /api/webhooks/stripe', () => {
    it('400 si falta el header stripe-signature', async () => {
      const res = await request(app)
        .post('/api/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .send(Buffer.from('{}'));

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Firma requerida');
    });

    it('400 si la firma es inválida', async () => {
      vi.mocked(stripeService.construirEvento).mockImplementation(() => {
        throw new Error('No signatures found matching the expected signature for payload');
      });

      const res = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'firma_invalida')
        .set('Content-Type', 'application/json')
        .send(Buffer.from('{}'));

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Firma inválida');
    });

    it('200 y procesa evento payment_intent.succeeded', async () => {
      vi.mocked(stripeService.construirEvento).mockReturnValue({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test_123' } },
      } as any);
      vi.mocked(pagoService.confirmarPagoWebhook).mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'firma_valida')
        .set('Content-Type', 'application/json')
        .send(Buffer.from('{}'));

      expect(res.status).toBe(200);
      expect(res.body.recibido).toBe(true);
      expect(vi.mocked(pagoService.confirmarPagoWebhook)).toHaveBeenCalledWith('pi_test_123');
    });

    it('200 e ignora eventos desconocidos', async () => {
      vi.mocked(stripeService.construirEvento).mockReturnValue({
        type: 'customer.created',
        data: { object: {} },
      } as any);

      const res = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'firma_valida')
        .set('Content-Type', 'application/json')
        .send(Buffer.from('{}'));

      expect(res.status).toBe(200);
      expect(res.body.recibido).toBe(true);
    });
  });

  // ── Iniciar pago (público) ────────────────────────────────────────────────

  describe('POST /api/reservaciones/:id/pago', () => {
    it('400 VALIDATION_ERROR si falta monto_centavos', async () => {
      const res = await request(app)
        .post('/api/reservaciones/1/pago')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.codigo).toBe('VALIDATION_ERROR');
    });

    it('400 VALIDATION_ERROR si monto_centavos es 0', async () => {
      const res = await request(app)
        .post('/api/reservaciones/1/pago')
        .send({ monto_centavos: 0 });

      expect(res.status).toBe(400);
      expect(res.body.codigo).toBe('VALIDATION_ERROR');
    });

    it('201 con client_secret si la reservación existe', async () => {
      vi.mocked(pagoService.iniciarPagoPorReservacion).mockResolvedValue({
        clientSecret: 'pi_test_abc_secret_xyz',
        intentoPagoId: 'pi_test_abc',
      } as any);

      const res = await request(app)
        .post('/api/reservaciones/1/pago')
        .send({ monto_centavos: 10000 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.datos).toHaveProperty('clientSecret');
    });
  });

  // ── Cancelar reservación (autenticado + autorizar) ────────────────────────

  describe('POST /api/reservaciones/:id/cancelar', () => {
    it('401 sin cookie de sesión', async () => {
      const res = await request(app).post('/api/reservaciones/1/cancelar');
      expect(res.status).toBe(401);
    });

    it('200 cancela la reservación', async () => {
      vi.mocked(pagoService.cancelarReservacion).mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/reservaciones/1/cancelar')
        .set('Cookie', getAuthCookie());

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ── Completar reservación (autenticado + autorizar) ───────────────────────

  describe('PATCH /api/reservaciones/:id/completar', () => {
    it('401 sin cookie de sesión', async () => {
      const res = await request(app).patch('/api/reservaciones/1/completar');
      expect(res.status).toBe(401);
    });

    it('200 completa la reservación', async () => {
      vi.mocked(pagoService.completarReservacion).mockResolvedValue(undefined);

      const res = await request(app)
        .patch('/api/reservaciones/1/completar')
        .set('Cookie', getAuthCookie());

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
