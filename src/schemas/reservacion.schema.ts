import { z } from '@/zod-extended';
import { MSG } from '@/constants';
// El enum rl_reservacion_estado fue reemplazado por la tabla catálogo ct_estado_reservacion.
// Las claves de estado se importan como constantes desde pago.schema para evitar magic strings.
import { ESTADO_RESERVACION } from '@/schemas/pago.schema';

// ── Campos ordenables (whitelist) ─────────────────────────────────────────────

export const CAMPOS_ORDENABLES_RESERVACION = [
  'id_rl_reservacion',
  // 'estado' ya no es columna directa — ahora la FK es id_ct_estado_reservacion
  'id_ct_estado_reservacion',
  'fecha_reservacion',
  'fecha_reg',
] as const;

// ── Campos base reutilizables ─────────────────────────────────────────────────

const campos = {
  id_ct_cliente: z.coerce
    .number()
    .int()
    .positive()
    .optional(),

  cliente: z
    .object({
      nombre: z
        .string()
        .trim()
        .min(3, MSG.VAL_MIN('nombre', 3))
        .max(100, MSG.VAL_MAX('nombre', 100)),
      correo: z.string().trim().email(MSG.VAL_EMAIL).max(255, MSG.VAL_MAX('correo', 255)),
      telefono: z
        .string()
        .trim()
        .regex(/^\+?[0-9\s\-]{8,20}$/, MSG.VAL_TELEFONO_INVALIDO),
    })
    .optional(),

  num_personas: z
    .number({ error: MSG.VAL_REQUERIDO('número de personas') })
    .int('Debe ser un número entero')
    .positive('Debe ser un número positivo')
    .max(50, 'No se permiten reservaciones para tantas personas'),

  fecha_reservacion: z.coerce
    .date({ error: 'Debe ser una fecha y hora válida (ISO string)' })
    .min(new Date(new Date().setHours(0, 0, 0, 0)), 'La fecha no puede ser pasada')
    .refine(
      (fecha) => {
        const horas = fecha.getHours();
        return horas >= 10 && horas < 24;
      },
      { message: 'La hora de reservación debe estar entre las 10:00 y las 23:59' },
    )
    .refine(
      (fecha) => {
        const ahora = new Date();
        // Margen de 2 horas desde el momento actual
        const margenMinimo = new Date(ahora.getTime() + 2 * 60 * 60 * 1000);
        return fecha > margenMinimo;
      },
      { message: 'Las reservaciones deben hacerse con al menos 2 horas de anticipación' }
    ),

  id_ct_mesa: z
    .number({ error: MSG.VAL_REQUERIDO('id de mesa') })
    .int('Debe ser un número entero')
    .positive('Debe ser un número positivo')
    .optional(),

  notas: z.string().max(500, 'Máximo 500 caracteres').optional().nullable(),
};

// ── Schemas ───────────────────────────────────────────────────────────────────

export const crearReservacionSchema = z.object({
  body: z.object(campos).refine(
    (data) => data.id_ct_cliente !== undefined || data.cliente !== undefined,
    {
      message: 'Debe proporcionar un id_ct_cliente o la información del cliente.',
      path: ['id_ct_cliente'],
    }
  ),
});

export const actualizarReservacionSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    // El estado ahora se pasa como la clave string del catálogo (ej: 'CONFIRMADA')
    // Las transiciones de estado válidas se validan en el service, no aquí.
    estado: z.enum(Object.values(ESTADO_RESERVACION) as [string, ...string[]]).optional(),
    id_ct_cliente: z.coerce.number().int().positive().optional(),
    id_ct_mesa: z.coerce.number().int().positive().optional(),
    fecha_reservacion: campos.fecha_reservacion.optional(),
    num_personas: campos.num_personas.optional(),
    notas: campos.notas,
  }),
});

export const filtrosReservacionesSchema = z.object({
  query: z.object({
    pagina: z.coerce.number().int().positive().optional(),
    limite: z.coerce.number().int().positive().max(100).optional(),
    id_ct_cliente: z.coerce.number().int().positive().optional(),
    id_ct_mesa: z.coerce.number().int().positive().optional(),
    // Filtrar por clave de estado del catálogo (ej: 'CONFIRMADA', 'CANCELADA')
    clave_estado: z.enum(Object.values(ESTADO_RESERVACION) as [string, ...string[]]).optional(),
    ordenar_por: z.enum(CAMPOS_ORDENABLES_RESERVACION).optional(),
    orden: z.enum(['asc', 'desc']).optional(),
  }),
});

// ── Tipos inferidos ───────────────────────────────────────────────────────────

export type CrearReservacionDTO = z.infer<typeof crearReservacionSchema>['body'];
export type ActualizarReservacionDTO = z.infer<typeof actualizarReservacionSchema>['body'];
export type FiltrosReservaciones = z.infer<typeof filtrosReservacionesSchema>['query'];
