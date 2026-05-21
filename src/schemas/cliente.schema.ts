import { z } from '@/zod-extended';
import { MSG } from '@/constants';

export const CAMPOS_ORDENABLES_CLIENTE = [
  'id_ct_cliente',
  'nombre',
  'correo',
  'fecha_reg',
] as const;

// ── Campos base reutilizables ─────────────────────────────────────────────────
const campos = {
  nombre: z
    .string()
    .trim()
    .min(1, MSG.VAL_REQUERIDO('nombre'))
    .max(100, MSG.VAL_MAX('nombre', 100)),

  correo: z.string().trim().email(MSG.VAL_EMAIL).max(255, MSG.VAL_MAX('correo', 255)),

  telefono: z
    .string()
    .trim()
    .min(1, MSG.VAL_REQUERIDO('teléfono'))
    .regex(/^\+?[0-9\s\-]{8,20}$/, MSG.VAL_TELEFONO_INVALIDO),
};

// ── Schemas ───────────────────────────────────────────────────────────────────
export const crearClienteSchema = z.object({
  body: z.object(campos),
});

export const actualizarClienteSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(MSG.VAL_REQUERIDO('id')),
  }),
  body: z
    .object({
      nombre: campos.nombre.optional(),
      correo: campos.correo.optional(),
      telefono: campos.telefono.optional(),
      estado: z.boolean().optional(),
    })
    .refine((data) => Object.values(data).some((v) => v !== undefined), {
      message: 'Debes enviar al menos un campo para actualizar',
    }),
});

export const filtrosClientesSchema = z.object({
  query: z.object({
    pagina: z.coerce.number().int().positive().optional(),
    limite: z.coerce.number().int().positive().max(100).optional(),
    busqueda: z.string().trim().optional(),
    estado: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    ordenar_por: z.enum(CAMPOS_ORDENABLES_CLIENTE).optional(),
    orden: z.enum(['asc', 'desc']).optional(),
  }),
});

export type CrearClienteDTO = z.infer<typeof crearClienteSchema>['body'];
export type ActualizarClienteDTO = z.infer<typeof actualizarClienteSchema>['body'];
export type FiltrosClientes = z.infer<typeof filtrosClientesSchema>['query'];
