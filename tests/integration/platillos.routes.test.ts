/**
 * @file platillos.routes.test.ts
 * @description Pruebas de integración para el módulo de Platillos.
 *
 * "Integración" aquí significa que se prueba el sistema completo de capas:
 *   HTTP request → route → middleware (auth + permisos) → controller → service → (Prisma mockeado)
 *
 * Lo que se MOCKEA (reemplaza con versión falsa):
 *   - Prisma: para no necesitar base de datos real. Cada test controla exactamente qué
 *     "devuelve" la BD, lo que hace los tests rápidos, predecibles y aislados.
 *
 * Lo que NO se mockea (se ejecuta de verdad):
 *   - El servidor Express completo (app)
 *   - Los middlewares de autenticación y autorización
 *   - Los controllers y services
 *   - La validación Zod de los schemas
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest'; // Simula peticiones HTTP sin levantar un puerto real
import jwt from 'jsonwebtoken'; // Para generar tokens de prueba válidos

// ── Mock de Prisma ─────────────────────────────────────────────────────────────
// IMPORTANTE: este vi.mock() DEBE ir antes de cualquier import que use Prisma.
// Vitest hoistea (mueve al inicio) estas llamadas automáticamente.
//
// Reemplazamos el módulo real de Prisma con un objeto de funciones falsas (vi.fn()).
// Cada vi.fn() empieza vacío — retorna undefined por defecto.
// En cada test definimos exactamente qué debe retornar con .mockResolvedValue().
// Mock del cache de autorización dinámica — en tests no hay BD para cargarlo,
// así que proveemos el mapeo ruta→permiso directamente para las rutas protegidas.
vi.mock('@/utils/ruta-permiso.cache', () => ({
  obtenerPermisoDeRuta: (metodo: string, ruta: string) => {
    const mapa: Record<string, string> = {
      'POST:/api/platillos':   'PLATILLOS_CREAR',
      'PATCH:/api/platillos':  'PLATILLOS_EDITAR',
      'DELETE:/api/platillos': 'PLATILLOS_BORRAR',
    };
    return mapa[`${metodo}:${ruta}`];
  },
  cargarCacheRutaPermisos:    () => Promise.resolve(),
  iniciarRefrescoAutomatico:  () => {},
  invalidarCacheRutaPermisos: () => Promise.resolve(),
  obtenerPermisosDeRol: () => undefined,
}));

vi.mock('@/config/database.config', () => ({
  prisma: {
    ct_platillo: {
      findMany: vi.fn(), // Usado por: obtenerTodos (listado paginado)
      findUnique: vi.fn(), // Usado por: obtenerPorId, actualizar, eliminar
      findFirst: vi.fn(), // Usado por: verificarNoExiste (unicidad de nombre)
      count: vi.fn(), // Usado por: paginar() — cuenta el total de registros
      create: vi.fn(), // Usado por: crear
      update: vi.fn(), // Usado por: actualizar, eliminar (soft delete)
    },
    rl_rol_permiso: {
      findMany: vi.fn(), // Usado por: autorizacion.middleware para cargar permisos del rol
    },
  },
}));

// Los imports de app y prisma van DESPUÉS del mock.
// Si estuvieran antes, Prisma se importaría sin el mock aplicado.
import { TODOS_LOS_PERMISOS } from '../helpers/permisos.fixture';
import app from '@/setup';
import { prisma } from '@/config/database.config';

// ── Helper: generar cookie de autenticación ────────────────────────────────────
// El middleware de autenticación espera una cookie "accessToken" con un JWT válido.
// En vez de hacer login real, firmamos el token directamente con el mismo secreto.
//
// Parámetros con valores por defecto para reutilizar en la mayoría de tests:
//   id=1         → id del usuario autenticado (se guarda en id_ct_usuario_reg/mod)
//   rol='ADMIN'  → rol del usuario
//   permisos=[…] → lista de códigos que el usuario tiene activos
const SECRET = process.env['JWT_SECRET']!;

const getAuthCookie = (
  id = 1,
  rol = 'ADMIN',
  permisos: string[] = ['PLATILLOS_VER', 'PLATILLOS_EDITAR'],
) => {
  const token = jwt.sign({ id_ct_usuario: id, usuario: 'admin', rol, permisos }, SECRET, {
    expiresIn: '15m',
  });
  // Formato de cookie que espera el middleware: "accessToken=<token>"
  return `accessToken=${token}`;
};

// ── Suite principal ────────────────────────────────────────────────────────────
describe('Módulo de Platillos — Rutas de Integración', () => {
  // beforeEach se ejecuta ANTES de cada test individual (cada `it`).
  // Propósito: dejar el estado limpio para que los tests no se contaminen entre sí.
  beforeEach(() => {
    // Resetea todos los mocks: borra llamadas anteriores y retornos configurados.
    // Sin esto, el mock de un test anterior podría afectar el siguiente.
    vi.clearAllMocks();

    // Mock de permisos — el middleware de autorización consulta rl_rol_permiso
    // para validar si el rol del usuario tiene el permiso requerido por la ruta.
    // Aquí simulamos que el rol ADMIN tiene TODOS los permisos del sistema,
    // así los tests de happy-path no fallan por falta de permiso.
    vi.mocked(prisma.rl_rol_permiso.findMany).mockResolvedValue(TODOS_LOS_PERMISOS as any);

    // findFirst en null por defecto → simula que no hay platillo duplicado.
    // El service lo usa en verificarNoExiste() antes de crear.
    // Tests que necesiten simular un duplicado sobreescriben este valor individualmente.
    vi.mocked(prisma.ct_platillo.findFirst).mockResolvedValue(null);
  });

  // ── GET /api/platillos ───────────────────────────────────────────────────────
  describe('GET /api/platillos', () => {
    it('debe retornar lista de platillos (endpoint público)', async () => {
      // Preparamos los datos que "devolvería" la BD.
      // El objeto mínimo necesario — solo los campos que el test verifica.
      // No necesitamos todos los campos del modelo real.
      const mockPlatillos = [{ id_ct_platillo: 1, nombre: 'Tacos', precio: 50, estado: true }];

      // findMany → devuelve el arreglo de platillos (usado por paginar())
      vi.mocked(prisma.ct_platillo.findMany).mockResolvedValue(mockPlatillos as any);
      // count → devuelve el total de registros para calcular totalPaginas en la meta
      vi.mocked(prisma.ct_platillo.count).mockResolvedValue(1);

      // Este endpoint es público (sin autenticación requerida en la ruta),
      // por eso NO se envía cookie. Si el test fallara con 401, significaría
      // que la ruta fue marcada como privada por error.
      const res = await request(app).get('/api/platillos');

      expect(res.status).toBe(200);
      expect(res.body.exito).toBe(true); // Forma del envelope: { exito, mensaje, datos, meta }
      expect(res.body.datos).toHaveLength(1); // Llegó exactamente 1 platillo
    });
  });

  // ── GET /api/platillos/:id ───────────────────────────────────────────────────
  describe('GET /api/platillos/:id', () => {
    it('debe retornar el detalle de un platillo', async () => {
      // findUnique con el id solicitado → simula que el platillo SÍ existe en BD
      vi.mocked(prisma.ct_platillo.findUnique).mockResolvedValue({
        id_ct_platillo: 1,
        nombre: 'Tacos',
      } as any);

      // Endpoint también público (solo lectura), sin cookie
      const res = await request(app).get('/api/platillos/1');

      expect(res.status).toBe(200);
      expect(res.body.datos.nombre).toBe('Tacos');
    });

    it('debe retornar 404 si el platillo no existe', async () => {
      // findUnique retorna null → simula que el id no existe en BD.
      // El helper buscarOError() del service lanza ErrorNoEncontrado (404) cuando recibe null.
      vi.mocked(prisma.ct_platillo.findUnique).mockResolvedValue(null);

      const res = await request(app).get('/api/platillos/99');

      // El error middleware convierte ErrorNoEncontrado → HTTP 404
      expect(res.status).toBe(404);
    });
  });

  // ── POST /api/platillos ──────────────────────────────────────────────────────
  describe('POST /api/platillos', () => {
    it('debe crear un platillo autenticado', async () => {
      // create retorna el platillo tal como lo devolvería Prisma tras el INSERT.
      // (findFirst ya está en null desde el beforeEach → no hay duplicado)
      vi.mocked(prisma.ct_platillo.create).mockResolvedValue({
        id_ct_platillo: 2,
        nombre: 'Hamburguesa',
        precio: 100,
        estado: true,
      } as any);

      const res = await request(app)
        .post('/api/platillos')
        // .set('Cookie', ...) inyecta la cookie de autenticación.
        // Sin esto, el middleware de autenticación rechazaría con 401.
        .set('Cookie', getAuthCookie())
        .send({ nombre: 'Hamburguesa', precio: 100, id_ct_categoria: 1 });

      // 201 Created — el recurso fue creado exitosamente
      expect(res.status).toBe(201);
      expect(res.body.datos.nombre).toBe('Hamburguesa');
    });

    it('debe retornar 401 si se intenta crear sin autenticación', async () => {
      // No se envía cookie → el middleware de autenticación debe rechazar la petición.
      // Este test verifica que la ruta SÍ está protegida (no es pública por error).
      const res = await request(app)
        .post('/api/platillos')
        .send({ nombre: 'Hamburguesa', precio: 100, id_ct_categoria: 1 });

      expect(res.status).toBe(401);
    });
  });

  // ── PATCH /api/platillos/:id ─────────────────────────────────────────────────
  describe('PATCH /api/platillos/:id', () => {
    it('debe actualizar un platillo', async () => {
      // El service primero llama findUnique para verificar que el platillo existe
      // (evita el error P2025 de Prisma con un mensaje claro).
      vi.mocked(prisma.ct_platillo.findUnique).mockResolvedValue({ id_ct_platillo: 1 } as any);
      // Luego llama update y retorna el registro actualizado.
      vi.mocked(prisma.ct_platillo.update).mockResolvedValue({
        id_ct_platillo: 1,
        precio: 120,
      } as any);

      const res = await request(app)
        .patch('/api/platillos/1')
        .set('Cookie', getAuthCookie())
        .send({ precio: 120 }); // PATCH permite enviar solo los campos a cambiar

      expect(res.status).toBe(200);
      expect(res.body.datos.precio).toBe(120);
    });
  });

  // ── DELETE /api/platillos/:id ────────────────────────────────────────────────
  describe('DELETE /api/platillos/:id', () => {
    it('debe desactivar un platillo', async () => {
      // El service verifica que exista antes de intentar el soft delete.
      vi.mocked(prisma.ct_platillo.findUnique).mockResolvedValue({
        id_ct_platillo: 1,
        estado: true,
      } as any);
      // El "eliminar" real es un UPDATE que pone estado=false (soft delete).
      // Así se preserva el historial en dt_detalle_orden.
      vi.mocked(prisma.ct_platillo.update).mockResolvedValue({
        id_ct_platillo: 1,
        estado: false,
      } as any);

      const res = await request(app).delete('/api/platillos/1').set('Cookie', getAuthCookie());

      // La ruta devuelve 200 con el registro desactivado (no 204)
      // porque el controller usa responder.ok() en vez de responder.sinContenido()
      expect(res.status).toBe(200);
    });
  });
});
