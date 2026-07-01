import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Mock de Prisma
vi.mock('@/utils/ruta-permiso.cache', () => ({
  obtenerPermisoDeRuta: (metodo: string, ruta: string) => {
    const mapa: Record<string, string> = {
      'POST:/api/ordenes':   'ORDENES_CREAR',
      'PATCH:/api/ordenes':  'ORDENES_ESTADO',
      'PUT:/api/ordenes':    'ORDENES_ESTADO',
      'DELETE:/api/ordenes': 'ORDENES_CANCELAR',
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
    rl_orden: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    dt_detalle_orden: {
      createMany: vi.fn(),
    },
    ct_mesa: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    ct_platillo: {
      findMany: vi.fn(),
    },
    rl_rol_permiso: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(vi.mocked(prisma))),
  },
}));

import { TODOS_LOS_PERMISOS } from '../helpers/permisos.fixture';
import app from '@/setup';
import { prisma } from '@/config/database.config';

const SECRET = process.env['JWT_SECRET']!;

const getAuthCookie = (id = 1, rol = 'ADMIN', permisos: string[] = []) => {
  const token = jwt.sign({ id_ct_usuario: id, usuario: 'admin', rol, permisos }, SECRET, {
    expiresIn: '15m',
  });
  return `accessToken=${token}`;
};

describe('Módulo de Órdenes — Rutas de Integración', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock por defecto para permisos
    vi.mocked(prisma.rl_rol_permiso.findMany).mockResolvedValue(TODOS_LOS_PERMISOS as any);
  });

  describe('GET /api/ordenes', () => {
    it('debe retornar lista de órdenes', async () => {
      const mockOrdenes = [{ id_rl_orden: 1, total: 500, estado: 'PENDIENTE' }];

      vi.mocked(prisma.rl_orden.findMany).mockResolvedValue(mockOrdenes as any);
      vi.mocked(prisma.rl_orden.count).mockResolvedValue(1);

      const res = await request(app).get('/api/ordenes').set('Cookie', getAuthCookie());

      expect(res.status).toBe(200);
      expect(res.body.datos).toHaveLength(1);
    });
  });

  describe('POST /api/ordenes', () => {
    const nuevaOrden = {
      id_mesa: 1,
      detalles: [{ id_ct_platillo: 1, cantidad: 2 }],
    };

    it('debe crear una orden con sus detalles', async () => {
      vi.mocked(prisma.ct_mesa.findUnique).mockResolvedValue({ id_ct_mesa: 1 } as any);
      vi.mocked(prisma.ct_platillo.findMany).mockResolvedValue([
        { id_ct_platillo: 1, precio: 50, estado: true },
      ] as any);

      vi.mocked(prisma.rl_orden.create).mockResolvedValue({
        id_rl_orden: 1,
        total: 100,
        estado: 'PENDIENTE',
        dt_detalle_orden: [],
        usuario: { id_ct_usuario: 1, nombre_completo: 'Admin' },
      } as any);

      const res = await request(app)
        .post('/api/ordenes')
        .set('Cookie', getAuthCookie())
        .send(nuevaOrden);

      expect(res.status).toBe(201);
      expect(res.body.datos.id_rl_orden).toBe(1);
    });
  });

  describe('PATCH /api/ordenes/:id/estado', () => {
    it('debe actualizar el estado de una orden', async () => {
      vi.mocked(prisma.rl_orden.findUnique).mockResolvedValue({
        id_rl_orden: 1,
        estado: 'PENDIENTE',
      } as any);
      vi.mocked(prisma.rl_orden.update).mockResolvedValue({
        id_rl_orden: 1,
        estado: 'EN_PROCESO',
        dt_detalle_orden: [],
        usuario: { id_ct_usuario: 1, nombre_completo: 'Admin' },
      } as any);

      const res = await request(app)
        .patch('/api/ordenes/1/estado')
        .set('Cookie', getAuthCookie())
        .send({ estado: 'EN_PROCESO' });

      expect(res.status).toBe(200);
      expect(res.body.datos.estado).toBe('EN_PROCESO');
    });
  });
});
