import { z } from '@/zod-extended';

export const loginSchema = z.object({
  body: z.object({
    usuario: z.string().trim().min(3, 'El usuario debe tener al menos 3 caracteres'),
    contrasena: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  }),
});

export const cambiarContrasenaSchema = z.object({
  body: z
    .object({
      contrasena_actual: z.string().min(8, 'La contraseña actual debe tener al menos 8 caracteres'),
      contrasena_nueva: z
        .string()
        .min(8, 'La contraseña nueva debe tener al menos 8 caracteres')
        .max(100),
      confirmar_contrasena: z.string(),
    })
    .refine((d) => d.contrasena_nueva === d.confirmar_contrasena, {
      message: 'Las contraseñas no coinciden',
      path: ['confirmar_contrasena'],
    }),
});

export const solicitarRecuperacionSchema = z.object({
  body: z.object({
    email: z.string().email('El email no es válido').toLowerCase(),
  }),
});

export const resetearContrasenaSchema = z.object({
  body: z
    .object({
      token: z.string().min(1, 'Token requerido'),
      contrasena_nueva: z
        .string()
        .min(8, 'La contraseña nueva debe tener al menos 8 caracteres')
        .max(100),
      confirmar_contrasena: z.string(),
    })
    .refine((d) => d.contrasena_nueva === d.confirmar_contrasena, {
      message: 'Las contraseñas no coinciden',
      path: ['confirmar_contrasena'],
    }),
});

export type LoginDTO              = z.infer<typeof loginSchema>['body'];
export type CambiarContrasenaDTO  = z.infer<typeof cambiarContrasenaSchema>['body'];
export type SolicitarRecuperacionDTO = z.infer<typeof solicitarRecuperacionSchema>['body'];
export type ResetearContrasenaDTO = z.infer<typeof resetearContrasenaSchema>['body'];
