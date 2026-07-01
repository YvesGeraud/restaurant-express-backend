import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock calls are hoisted before imports by Vitest — always declare mocks first
vi.mock('@/config/database.config', () => ({
  prisma: {
    rl_reservacion: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    ct_estado_reservacion: {
      findUnique: vi.fn(),
    },
    ct_configuracion: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/services/stripe.service', () => ({
  default: {
    crearIntentoPago:    vi.fn(),
    capturarPago:        vi.fn(),
    liberarAutorizacion: vi.fn(),
  },
}));

vi.mock('@/services/email.service', () => ({
  default: {
    enviarConfirmacionReservacion: vi.fn(),
    enviarConPlantillaPublica:     vi.fn(),
  },
}));

vi.mock('@/utils/logger.utils', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import pagoService from '@/services/pago.service';
import { prisma }   from '@/config/database.config';
import stripeService from '@/services/stripe.service';
import emailService  from '@/services/email.service';
import { ESTADO_RESERVACION } from '@/schemas/pago.schema';
import { ErrorNoEncontrado, ErrorValidacion } from '@/utils/errores.utils';

// ── Constantes de tiempo ──────────────────────────────────────────────────────

const AHORA  = new Date();
const EN_48H = new Date(AHORA.getTime() + 48 * 60 * 60 * 1_000); // bien dentro del período de gracia
const EN_2H  = new Date(AHORA.getTime() +  2 * 60 * 60 * 1_000); // fuera del período de gracia (24 h)

// ── Helpers de fixtures ───────────────────────────────────────────────────────

function reservacionBase(overrides: Record<string, unknown> = {}) {
  return {
    id_rl_reservacion:      1,
    clave_intento_pago:     'pi_test_001',
    fecha_reservacion:      EN_48H,
    horas_gracia_cancelacion: 24,
    num_personas:           4,
    id_ct_cliente:          10,
    ct_estado_reservacion:  { clave: ESTADO_RESERVACION.CONFIRMADA, nombre: 'Confirmada' },
    ct_cliente:             { correo: 'cliente@test.com', nombre: 'Juan Pérez' },
    ...overrides,
  };
}

// Estado genérico — los tests sólo necesitan que devuelva un ID numérico
const ESTADO_BD = { id_ct_estado_reservacion: 2, clave: 'dummy' };

// Configuración por defecto del restaurante
const CONFIG_BD = { monto_penalizacion_centavos: 20_000, horas_gracia_cancelacion: 24 };

// ── Suite principal ───────────────────────────────────────────────────────────

describe('PagoService — Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Valores por defecto para todos los tests
    vi.mocked(prisma.rl_reservacion.update).mockResolvedValue({} as any);
    vi.mocked(prisma.ct_estado_reservacion.findUnique).mockResolvedValue(ESTADO_BD as any);
    vi.mocked(prisma.ct_configuracion.findFirst).mockResolvedValue(CONFIG_BD as any);

    vi.mocked(stripeService.crearIntentoPago).mockResolvedValue({
      id:            'pi_new_001',
      status:        'requires_payment_method',
      client_secret: 'pi_new_001_secret_xyz',
    } as any);
    vi.mocked(stripeService.capturarPago).mockResolvedValue(undefined as any);
    vi.mocked(stripeService.liberarAutorizacion).mockResolvedValue(undefined as any);

    vi.mocked(emailService.enviarConfirmacionReservacion).mockResolvedValue(undefined);
    vi.mocked(emailService.enviarConPlantillaPublica).mockResolvedValue(undefined);
  });

  // ── iniciarPagoPorReservacion ─────────────────────────────────────────────

  describe('iniciarPagoPorReservacion()', () => {
    it('lanza ErrorNoEncontrado si la reservación no existe en BD', async () => {
      vi.mocked(prisma.rl_reservacion.findUnique).mockResolvedValue(null);

      await expect(pagoService.iniciarPagoPorReservacion(99, 10_000))
        .rejects.toBeInstanceOf(ErrorNoEncontrado);

      expect(stripeService.crearIntentoPago).not.toHaveBeenCalled();
    });

    it('lanza ErrorValidacion si la reservación ya tiene un intento de pago activo', async () => {
      vi.mocked(prisma.rl_reservacion.findUnique).mockResolvedValue(
        reservacionBase({ clave_intento_pago: 'pi_ya_existe' }) as any,
      );

      await expect(pagoService.iniciarPagoPorReservacion(1, 10_000))
        .rejects.toBeInstanceOf(ErrorValidacion);

      // No debe hablar con Stripe si ya hay un pago en curso
      expect(stripeService.crearIntentoPago).not.toHaveBeenCalled();
    });

    it('crea el intento en Stripe con el monto correcto', async () => {
      vi.mocked(prisma.rl_reservacion.findUnique).mockResolvedValue(
        reservacionBase({ clave_intento_pago: null }) as any,
      );

      await pagoService.iniciarPagoPorReservacion(1, 15_000);

      expect(stripeService.crearIntentoPago).toHaveBeenCalledWith(
        15_000,
        'mxn',
        expect.objectContaining({ id_reservacion: '1' }),
      );
    });

    it('actualiza la reservación con la clave del intento de pago', async () => {
      vi.mocked(prisma.rl_reservacion.findUnique).mockResolvedValue(
        reservacionBase({ clave_intento_pago: null }) as any,
      );

      await pagoService.iniciarPagoPorReservacion(1, 10_000);

      expect(prisma.rl_reservacion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id_rl_reservacion: 1 },
          data:  expect.objectContaining({ clave_intento_pago: 'pi_new_001' }),
        }),
      );
    });

    it('devuelve el client_secret que Stripe genera', async () => {
      vi.mocked(prisma.rl_reservacion.findUnique).mockResolvedValue(
        reservacionBase({ clave_intento_pago: null }) as any,
      );

      const resultado = await pagoService.iniciarPagoPorReservacion(1, 10_000);

      expect(resultado).toHaveProperty('client_secret', 'pi_new_001_secret_xyz');
    });
  });

  // ── confirmarPagoWebhook ──────────────────────────────────────────────────

  describe('confirmarPagoWebhook()', () => {
    it('termina silenciosamente si no hay reservación para ese intento de pago', async () => {
      vi.mocked(prisma.rl_reservacion.findUnique).mockResolvedValue(null);

      await expect(pagoService.confirmarPagoWebhook('pi_fantasma')).resolves.toBeUndefined();

      // No debe actualizar nada — el evento podría ser un test de Stripe
      expect(prisma.rl_reservacion.update).not.toHaveBeenCalled();
    });

    it('ignora webhooks duplicados cuando la reservación ya está CONFIRMADA (idempotencia)', async () => {
      vi.mocked(prisma.rl_reservacion.findUnique).mockResolvedValue(
        reservacionBase({
          ct_estado_reservacion: { clave: ESTADO_RESERVACION.CONFIRMADA, nombre: 'Confirmada' },
        }) as any,
      );

      await expect(pagoService.confirmarPagoWebhook('pi_test_001')).resolves.toBeUndefined();

      expect(prisma.rl_reservacion.update).not.toHaveBeenCalled();
      expect(emailService.enviarConfirmacionReservacion).not.toHaveBeenCalled();
    });

    it('actualiza el estado a CONFIRMADA y envía email de confirmación', async () => {
      vi.mocked(prisma.rl_reservacion.findUnique).mockResolvedValue(
        reservacionBase({
          ct_estado_reservacion: { clave: ESTADO_RESERVACION.PENDIENTE_PAGO, nombre: 'Pendiente' },
        }) as any,
      );

      await pagoService.confirmarPagoWebhook('pi_test_001');

      expect(prisma.rl_reservacion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ estado_pago_stripe: 'requires_capture' }),
        }),
      );
      expect(emailService.enviarConfirmacionReservacion).toHaveBeenCalledWith(
        'cliente@test.com',
        expect.objectContaining({ nombreCliente: 'Juan Pérez', numPersonas: 4 }),
      );
    });

    it('no lanza aunque el envío de email falle (fallos de SMTP no bloquean la confirmación)', async () => {
      vi.mocked(prisma.rl_reservacion.findUnique).mockResolvedValue(
        reservacionBase({
          ct_estado_reservacion: { clave: ESTADO_RESERVACION.PENDIENTE_PAGO, nombre: 'Pendiente' },
        }) as any,
      );
      vi.mocked(emailService.enviarConfirmacionReservacion)
        .mockRejectedValue(new Error('SMTP connection refused'));

      await expect(pagoService.confirmarPagoWebhook('pi_test_001')).resolves.toBeUndefined();

      // La reservación SÍ debe haberse marcado como confirmada en BD
      expect(prisma.rl_reservacion.update).toHaveBeenCalled();
    });
  });

  // ── procesarNoShow ────────────────────────────────────────────────────────

  describe('procesarNoShow()', () => {
    it('lanza ErrorNoEncontrado si la reservación no existe', async () => {
      vi.mocked(prisma.rl_reservacion.findUnique).mockResolvedValue(null);

      await expect(pagoService.procesarNoShow(99)).rejects.toBeInstanceOf(ErrorNoEncontrado);
    });

    it('termina silenciosamente si la reservación no está en estado CONFIRMADA', async () => {
      vi.mocked(prisma.rl_reservacion.findUnique).mockResolvedValue(
        reservacionBase({
          ct_estado_reservacion: { clave: ESTADO_RESERVACION.COMPLETADA, nombre: 'Completada' },
        }) as any,
      );

      await expect(pagoService.procesarNoShow(1)).resolves.toBeUndefined();

      // El cron no debe capturar cargos en reservaciones ya cerradas
      expect(stripeService.capturarPago).not.toHaveBeenCalled();
    });

    it('captura el cargo de penalización en Stripe y actualiza el estado a NO_SHOW', async () => {
      vi.mocked(prisma.rl_reservacion.findUnique).mockResolvedValue(
        reservacionBase({
          ct_estado_reservacion: { clave: ESTADO_RESERVACION.CONFIRMADA, nombre: 'Confirmada' },
          clave_intento_pago:    'pi_noshow_001',
        }) as any,
      );

      await pagoService.procesarNoShow(1);

      // Stripe debe recibir la clave correcta y el monto de la configuración
      expect(stripeService.capturarPago).toHaveBeenCalledWith('pi_noshow_001', 20_000);
      expect(prisma.rl_reservacion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ estado_pago_stripe: 'captured' }),
        }),
      );
    });

    it('envía el email de no-show al cliente', async () => {
      vi.mocked(prisma.rl_reservacion.findUnique).mockResolvedValue(
        reservacionBase({
          ct_estado_reservacion: { clave: ESTADO_RESERVACION.CONFIRMADA, nombre: 'Confirmada' },
        }) as any,
      );

      await pagoService.procesarNoShow(1);

      expect(emailService.enviarConPlantillaPublica).toHaveBeenCalledWith(
        'cliente@test.com',
        'RESERVA_NO_SHOW',
        expect.objectContaining({ nombreCliente: 'Juan Pérez' }),
      );
    });
  });

  // ── cancelarReservacion ───────────────────────────────────────────────────

  describe('cancelarReservacion()', () => {
    it('lanza ErrorNoEncontrado si la reservación no existe', async () => {
      vi.mocked(prisma.rl_reservacion.findUnique).mockResolvedValue(null);

      await expect(pagoService.cancelarReservacion(99, 5)).rejects.toBeInstanceOf(ErrorNoEncontrado);
    });

    it('lanza ErrorValidacion si el estado no permite cancelación (ej. COMPLETADA)', async () => {
      vi.mocked(prisma.rl_reservacion.findUnique).mockResolvedValue(
        reservacionBase({
          ct_estado_reservacion: { clave: ESTADO_RESERVACION.COMPLETADA, nombre: 'Completada' },
        }) as any,
      );

      await expect(pagoService.cancelarReservacion(1, 5)).rejects.toBeInstanceOf(ErrorValidacion);

      expect(stripeService.liberarAutorizacion).not.toHaveBeenCalled();
      expect(stripeService.capturarPago).not.toHaveBeenCalled();
    });

    it('lanza ErrorValidacion si el estado es NO_SHOW (no cancelable)', async () => {
      vi.mocked(prisma.rl_reservacion.findUnique).mockResolvedValue(
        reservacionBase({
          ct_estado_reservacion: { clave: ESTADO_RESERVACION.NO_SHOW, nombre: 'No Show' },
        }) as any,
      );

      await expect(pagoService.cancelarReservacion(1, 5)).rejects.toBeInstanceOf(ErrorValidacion);
    });

    it('libera la autorización SIN cargo cuando se cancela dentro del período de gracia', async () => {
      // 48 h restantes > 24 h de gracia → cancelación gratuita
      vi.mocked(prisma.rl_reservacion.findUnique).mockResolvedValue(
        reservacionBase({
          fecha_reservacion:       EN_48H,
          horas_gracia_cancelacion: 24,
          ct_estado_reservacion:   { clave: ESTADO_RESERVACION.CONFIRMADA, nombre: 'Confirmada' },
        }) as any,
      );

      await pagoService.cancelarReservacion(1, 5);

      expect(stripeService.liberarAutorizacion).toHaveBeenCalledWith('pi_test_001');
      expect(stripeService.capturarPago).not.toHaveBeenCalled();
      expect(prisma.rl_reservacion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ estado_pago_stripe: 'released' }),
        }),
      );
    });

    it('actualiza el estado a CANCELADA (sin cargo) cuando la cancelación es gratuita', async () => {
      vi.mocked(prisma.rl_reservacion.findUnique).mockResolvedValue(
        reservacionBase({ fecha_reservacion: EN_48H, horas_gracia_cancelacion: 24 }) as any,
      );

      // El ID de estado que devuelve ct_estado_reservacion.findUnique se usa para la FK
      vi.mocked(prisma.ct_estado_reservacion.findUnique).mockResolvedValue({
        id_ct_estado_reservacion: 5,
        clave: ESTADO_RESERVACION.CANCELADA,
      } as any);

      await pagoService.cancelarReservacion(1, 5);

      // estado_pago_stripe debe ser 'released' — no 'captured'
      expect(prisma.rl_reservacion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estado_pago_stripe: 'released',
            id_ct_usuario_mod: 5,
          }),
        }),
      );
    });

    it('captura la penalización CON cargo cuando se cancela fuera del período de gracia', async () => {
      // 2 h restantes < 24 h de gracia → cancelación con cargo
      vi.mocked(prisma.rl_reservacion.findUnique).mockResolvedValue(
        reservacionBase({
          fecha_reservacion:       EN_2H,
          horas_gracia_cancelacion: 24,
          ct_estado_reservacion:   { clave: ESTADO_RESERVACION.CONFIRMADA, nombre: 'Confirmada' },
        }) as any,
      );

      await pagoService.cancelarReservacion(1, 5);

      expect(stripeService.capturarPago).toHaveBeenCalledWith('pi_test_001', 20_000);
      expect(stripeService.liberarAutorizacion).not.toHaveBeenCalled();
      expect(prisma.rl_reservacion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ estado_pago_stripe: 'captured' }),
        }),
      );
    });

    it('envía el email de cancelación sin cargo a la plantilla correcta', async () => {
      vi.mocked(prisma.rl_reservacion.findUnique).mockResolvedValue(
        reservacionBase({ fecha_reservacion: EN_48H }) as any,
      );

      await pagoService.cancelarReservacion(1, 5);

      expect(emailService.enviarConPlantillaPublica).toHaveBeenCalledWith(
        'cliente@test.com',
        'RESERVA_CANCELADA_SIN_CARGO',
        expect.any(Object),
      );
    });

    it('envía el email de cancelación con cargo a la plantilla correcta', async () => {
      vi.mocked(prisma.rl_reservacion.findUnique).mockResolvedValue(
        reservacionBase({ fecha_reservacion: EN_2H }) as any,
      );

      await pagoService.cancelarReservacion(1, 5);

      expect(emailService.enviarConPlantillaPublica).toHaveBeenCalledWith(
        'cliente@test.com',
        'RESERVA_CANCELADA_CON_CARGO',
        expect.any(Object),
      );
    });
  });

  // ── completarReservacion ──────────────────────────────────────────────────

  describe('completarReservacion()', () => {
    it('lanza ErrorNoEncontrado si la reservación no existe', async () => {
      vi.mocked(prisma.rl_reservacion.findUnique).mockResolvedValue(null);

      await expect(pagoService.completarReservacion(99, 5)).rejects.toBeInstanceOf(ErrorNoEncontrado);
    });

    it('lanza ErrorValidacion si la reservación no está en estado CONFIRMADA', async () => {
      vi.mocked(prisma.rl_reservacion.findUnique).mockResolvedValue(
        reservacionBase({
          ct_estado_reservacion: { clave: ESTADO_RESERVACION.PENDIENTE_PAGO, nombre: 'Pendiente' },
        }) as any,
      );

      await expect(pagoService.completarReservacion(1, 5)).rejects.toBeInstanceOf(ErrorValidacion);

      expect(stripeService.liberarAutorizacion).not.toHaveBeenCalled();
    });

    it('libera la autorización en Stripe (el cliente asistió, no se cobra nada)', async () => {
      vi.mocked(prisma.rl_reservacion.findUnique).mockResolvedValue(
        reservacionBase({ clave_intento_pago: 'pi_complete_001' }) as any,
      );

      await pagoService.completarReservacion(1, 5);

      expect(stripeService.liberarAutorizacion).toHaveBeenCalledWith('pi_complete_001');
      expect(stripeService.capturarPago).not.toHaveBeenCalled();
    });

    it('actualiza el estado a COMPLETADA con el usuario que la cerró (auditoría)', async () => {
      vi.mocked(prisma.rl_reservacion.findUnique).mockResolvedValue(
        reservacionBase({ clave_intento_pago: 'pi_complete_001' }) as any,
      );

      await pagoService.completarReservacion(1, 42);

      expect(prisma.rl_reservacion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id_rl_reservacion: 1 },
          data:  expect.objectContaining({
            estado_pago_stripe: 'released',
            id_ct_usuario_mod:  42,
          }),
        }),
      );
    });
  });
});
