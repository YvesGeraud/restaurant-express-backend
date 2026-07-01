import { z } from '@/zod-extended';

/**
 * Definición declarativa de todas las variables de entorno del sistema.
 */
export const entornoSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(3000),
    UPLOAD_BASE_PATH: z.string().default('uploads'),
    API_URL: z.string().url('API_URL debe ser una URL válida').default('http://localhost:3000'),
    HOST: z.string().default('/'),

    // Base de Datos
    DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
    DB_HOST: z.string().optional(),
    DB_PORT: z.coerce.number().optional(),
    DBNAMES: z.string().optional(),
    DB_USER: z.string().optional(),
    DB_PASSWORD: z.string().optional(),

    // Seguridad y CORS
    ALLOWED_ORIGINS: z
      .string()
      .default('http://localhost:4200')
      .transform((str) =>
        str
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      ),

    // APIs externas
    API_EXTERNA_URL: z.string().url('API_EXTERNA_URL debe ser una URL válida').optional(),

    // Stripe
    STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY es obligatorio'),
    STRIPE_WEBHOOK_SECRET: z.string().min(1, 'STRIPE_WEBHOOK_SECRET es obligatorio'),
    STRIPE_PUBLISHABLE_KEY: z.string().min(1, 'STRIPE_PUBLISHABLE_KEY es obligatorio'),

    // Email (SMTP) — opcionales con defaults de Mailtrap para desarrollo
    MAIL_HOST: z.string().default('sandbox.smtp.mailtrap.io'),
    MAIL_PORT: z.coerce.number().default(2525),
    MAIL_USER: z.string().default(''),
    MAIL_PASS: z.string().default(''),
    MAIL_FROM: z.string().default('Restaurante <noreply@restaurante.com>'),

    // Autenticación
    JWT_SECRET: z.string().min(1, 'JWT_SECRET es obligatorio'),
    JWT_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET es obligatorio'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    BCRYPT_ROUNDS: z.coerce.number().default(12),
  })
  .transform((data) => {
    // Autoconfiguración: Si tenemos DATABASE_URL, extraemos los componentes faltantes para el adaptador
    try {
      const url = new URL(data.DATABASE_URL);
      return {
        ...data,
        DB_HOST: url.hostname,
        DB_PORT: url.port ? parseInt(url.port) : 3306,
        DB_USER: url.username,
        DB_PASSWORD: decodeURIComponent(url.password),
        DBNAMES: url.pathname.replace('/', ''),
      };
    } catch {
      return data;
    }
  });

export type Entorno = z.infer<typeof entornoSchema>;
