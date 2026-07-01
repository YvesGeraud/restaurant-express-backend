import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Mock de Prisma
vi.mock('@/utils/ruta-permiso.cache', () => ({
  obtenerPermisoDeRuta: (metodo: string, ruta: string) => {
    const mapa: Record<string, string> = {
      'GET:/api/reservaciones':    'RESERVACIONES_VER',
      'PATCH:/api/reservaciones':  'RESERVACIONES_EDITAR',
      'DELETE:/api/reservaciones': 'RESERVACIONES_BORRAR',
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
    rl_reservacion: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    ct_cliente: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    ct_mesa: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    ct_estado_reservacion: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    ct_configuracion: {
      findFirst: vi.fn(),
    },
    rl_rol_permiso: {
      findMany: vi.fn(),
    },
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

describe('Módulo de Reservaciones — Rutas de Integración', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock por defecto para permisos
    vi.mocked(prisma.rl_rol_permiso.findMany).mockResolvedValue(TODOS_LOS_PERMISOS as any);

    vi.mocked(prisma.ct_estado_reservacion.findUnique).mockResolvedValue({
      id_ct_estado_reservacion: 1,
      clave: 'PENDIENTE_PAGO',
      nombre: 'Pendiente de Pago',
    } as any);
    vi.mocked(prisma.ct_configuracion.findFirst).mockResolvedValue({
      horas_gracia_cancelacion: 24,
    } as any);
  });

  describe('GET /api/reservaciones', () => {
    it('debe retornar lista de reservaciones', async () => {
      const mockReservaciones = [{ id_rl_reservacion: 1, estado: 'PENDIENTE' }];

      vi.mocked(prisma.rl_reservacion.findMany).mockResolvedValue(mockReservaciones as any);
      vi.mocked(prisma.rl_reservacion.count).mockResolvedValue(1);

      const res = await request(app).get('/api/reservaciones').set('Cookie', getAuthCookie());

      expect(res.status).toBe(200);
      expect(res.body.datos).toHaveLength(1);
    });
  });

  describe('POST /api/reservaciones', () => {
    // Usar una fecha mañana a las 6 PM UTC para evitar problemas de timezone (18:00 >= 10:00)
    const fechaManana = new Date();
    fechaManana.setDate(fechaManana.getDate() + 1);
    fechaManana.setUTCHours(18, 0, 0, 0);
    const fechaStr = fechaManana.toISOString();

    const nuevaReservacion = {
      id_ct_cliente: 1,
      fecha_reservacion: fechaStr,
      num_personas: 4,
    };

    it('debe crear una reservación si el cliente existe', async () => {
      vi.mocked(prisma.ct_cliente.findUnique).mockResolvedValue({ id_ct_cliente: 1 } as any);
      vi.mocked(prisma.rl_reservacion.create).mockResolvedValue({
        id_rl_reservacion: 1,
        ...nuevaReservacion,
        estado: 'PENDIENTE',
      } as any);

      const res = await request(app)
        .post('/api/reservaciones')
        .set('Cookie', getAuthCookie())
        .send(nuevaReservacion);

      expect(res.status).toBe(201);
      expect(res.body.datos.estado).toBe('PENDIENTE');
    });

    it('debe retornar 404 si el cliente no existe', async () => {
      vi.mocked(prisma.ct_cliente.findUnique).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/reservaciones')
        .set('Cookie', getAuthCookie())
        .send(nuevaReservacion);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/reservaciones/:id', () => {
    it('debe actualizar el estado de una reservación', async () => {
      vi.mocked(prisma.rl_reservacion.findUnique).mockResolvedValue({
        id_rl_reservacion: 1,
        estado: 'PENDIENTE',
      } as any);
      vi.mocked(prisma.rl_reservacion.update).mockResolvedValue({
        id_rl_reservacion: 1,
        estado: 'CONFIRMADA',
      } as any);

      const res = await request(app)
        .patch('/api/reservaciones/1')
        .set('Cookie', getAuthCookie())
        .send({ estado: 'CONFIRMADA' });

      expect(res.status).toBe(200);
      expect(res.body.datos.estado).toBe('CONFIRMADA');
    });
  });

  describe('DELETE /api/reservaciones/:id', () => {
    it('debe cambiar el estado a CANCELADA', async () => {
      vi.mocked(prisma.rl_reservacion.findUnique).mockResolvedValue({
        id_rl_reservacion: 1,
        estado: 'PENDIENTE',
      } as any);
      vi.mocked(prisma.rl_reservacion.update).mockResolvedValue({
        id_rl_reservacion: 1,
        estado: 'CANCELADA',
      } as any);

      const res = await request(app).delete('/api/reservaciones/1').set('Cookie', getAuthCookie());

      expect(res.status).toBe(200);
      expect(prisma.rl_reservacion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ id_ct_estado_reservacion: 1 }),
        }),
      );
    });
  });
});
