import { entornoSchema } from '@/schemas/entorno.schema';

// ── Parseo y Exportación ──────────────────────────────────────────────────────

/**
 * .safeParse() permite manejar el error manualmente para dar un mensaje claro.
 * Si algo falla, el servidor NO debe arrancar porque su configuración sería inválida.
 */
const resultado = entornoSchema.safeParse(process.env);

if (!resultado.success) {
  console.error('\n❌ Error de configuración (Variables de Entorno):\n');
  const errores = resultado.error.flatten().fieldErrors;
  for (const [campo, mensajes] of Object.entries(errores)) {
    console.error(`   • ${campo}: ${mensajes?.join(', ')}`);
  }
  process.exit(1);
}

const env = resultado.data;

export const config = {
  nodeEnv: env.NODE_ENV,
  esProduccion: env.NODE_ENV === 'production',
  puerto: env.PORT,
  uploadPath: env.UPLOAD_BASE_PATH,
  apiUrl: env.API_URL,
  basePath: env.HOST,
  apiExternaUrl: env.API_EXTERNA_URL,

  db: {
    url: env.DATABASE_URL,
    host: env.DB_HOST,
    port: env.DB_PORT,
    nombre: env.DBNAMES,
    usuario: env.DB_USER,
    password: env.DB_PASSWORD,
  },

  cors: {
    origenes: env.ALLOWED_ORIGINS,
  },

  jwt: {
    secret: env.JWT_SECRET,
    expiracion: env.JWT_EXPIRES_IN,
    refreshSecret: env.JWT_REFRESH_SECRET,
    refreshExpiracion: env.JWT_REFRESH_EXPIRES_IN,
  },

  bcrypt: {
    rounds: env.BCRYPT_ROUNDS,
  },

  mail: {
    host: env.MAIL_HOST,
    port: env.MAIL_PORT,
    user: env.MAIL_USER,
    pass: env.MAIL_PASS,
    from: env.MAIL_FROM,
  },
} as const;

export type Config = typeof config;
