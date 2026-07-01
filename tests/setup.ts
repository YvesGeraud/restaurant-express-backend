/**
 * Se ejecuta ANTES de cada archivo de test (setupFiles en vitest.config.ts).
 * Establece variables de entorno para que servidor.config.ts pueda importarse
 * sin fallar por variables "requeridas" ausentes.
 *
 * NO cargamos dotenv aquí — así evitamos que los valores reales de .env
 * interfieran con los tests.
 */

process.env['NODE_ENV'] = 'test';
process.env['JWT_SECRET'] = 'clave-secreta-test-minimo-32-caracteres!!';
process.env['JWT_REFRESH_SECRET'] = 'clave-refresh-test-minimo-32-caracteres!';
process.env['JWT_EXPIRES_IN'] = '15m';
process.env['JWT_REFRESH_EXPIRES_IN'] = '7d';

// DATABASE_URL es requerida por servidor.config — valor falso está bien
// porque en tests la BD se mockea y nunca se usa para conectar
process.env['DATABASE_URL'] = 'mysql://test:test@localhost:3306/test_restaurante';
process.env['DB_HOST'] = 'localhost';
process.env['DB_PORT'] = '3306';
process.env['DBNAMES'] = 'test_restaurante';
process.env['DB_USER'] = 'test';
process.env['DB_PASSWORD'] = 'test';

// Stripe — valores ficticios, Stripe se mockea en cada test que lo necesita
process.env['STRIPE_SECRET_KEY'] = 'sk_test_fake_key_for_tests';
process.env['STRIPE_WEBHOOK_SECRET'] = 'whsec_fake_webhook_secret_for_tests';
process.env['STRIPE_PUBLISHABLE_KEY'] = 'pk_test_fake_publishable_key_for_tests';
