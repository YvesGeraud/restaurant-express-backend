import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Mock de Prisma
vi.mock('@/config/database.config', () => ({
  prisma: {
    ct_mesa: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    ct_usuario: {
      findUnique: vi.fn(),
    },
    rl_rol_permiso: {
      findMany: vi.fn(),
    },
  },
}));

import app from '@/setup';
import { prisma } from '@/config/database.config';

const SECRET = process.env['JWT_SECRET']!;

// Helper para generar cookie de acceso
const getAuthCookie = (id = 1, rol = 'ADMIN', permisos: string[] = ['CONFIG_VER']) => {
  const token = jwt.sign({ id_ct_usuario: id, usuario: 'admin', rol, permisos }, SECRET, {
    expiresIn: '15m',
  });
  return `accessToken=${token}`;
};

describe('Módulo de Mesas — Rutas de Integración', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock por defecto para permisos (Admin con CONFIG_VER)
    vi.mocked(prisma.rl_rol_permiso.findMany).mockResolvedValue([
      { ct_permiso: { codigo: 'CONFIG_VER' } },
    ] as any);
  });

  describe('GET /api/mesas', () => {
    it('debe retornar lista de mesas paginada para usuario autenticado', async () => {
      const mockMesas = [
        { id_ct_mesa: 1, codigo: 'M1', capacidad: 4, estado: true },
        { id_ct_mesa: 2, codigo: 'M2', capacidad: 2, estado: true },
      ];

      vi.mocked(prisma.ct_mesa.findMany).mockResolvedValue(mockMesas);
      vi.mocked(prisma.ct_mesa.count).mockResolvedValue(2);

      const res = await request(app).get('/api/mesas').set('Cookie', getAuthCookie());

      expect(res.status).toBe(200);
      expect(res.body.exito).toBe(true);
      expect(res.body.datos).toHaveLength(2);
      expect(res.body.meta.totalRegistros).toBe(2);
    });

    it('debe permitir el acceso público (sin token)', async () => {
      const mockMesas = [
        { id_ct_mesa: 1, codigo: 'M1', capacidad: 4, estado: true },
      ];
      vi.mocked(prisma.ct_mesa.findMany).mockResolvedValue(mockMesas);
      vi.mocked(prisma.ct_mesa.count).mockResolvedValue(1);

      const res = await request(app).get('/api/mesas');
      expect(res.status).toBe(200);
      expect(res.body.exito).toBe(true);
      expect(res.body.datos).toHaveLength(1);
    });
  });

  describe('POST /api/mesas', () => {
    const nuevaMesa = { codigo: 'M3', capacidad: 6 };

    it('debe crear una mesa si tiene permiso CONFIG_VER', async () => {
      vi.mocked(prisma.ct_mesa.findUnique).mockResolvedValue(null); // No existe duplicado
      vi.mocked(prisma.ct_mesa.create).mockResolvedValue({
        id_ct_mesa: 3,
        ...nuevaMesa,
        estado: true,
        fecha_reg: new Date(),
      } as any);

      const res = await request(app)
        .post('/api/mesas')
        .set('Cookie', getAuthCookie())
        .send(nuevaMesa);

      expect(res.status).toBe(201);
      expect(res.body.datos.codigo).toBe('M3');
      expect(prisma.ct_mesa.create).toHaveBeenCalled();
    });

    it('debe retornar 403 si el usuario no tiene permisos (ej: CAJERO sin CONFIG_VER)', async () => {
      vi.mocked(prisma.rl_rol_permiso.findMany).mockResolvedValueOnce([]); // Sin permisos

      const res = await request(app)
        .post('/api/mesas')
        .set('Cookie', getAuthCookie(2, 'CAJERO', ['CLIENTES_VER']))
        .send(nuevaMesa);

      expect(res.status).toBe(403);
      expect(res.body.codigo).toBe('FORBIDDEN');
    });

    it('debe retornar 409 si el código de mesa ya existe', async () => {
      vi.mocked(prisma.ct_mesa.findUnique).mockResolvedValue({ id_ct_mesa: 1 } as any);

      const res = await request(app)
        .post('/api/mesas')
        .set('Cookie', getAuthCookie())
        .send(nuevaMesa);

      expect(res.status).toBe(409);
      expect(res.body.codigo).toBe('CONFLICT');
    });
  });

  describe('PATCH /api/mesas/:id', () => {
    it('debe actualizar una mesa existente', async () => {
      vi.mocked(prisma.ct_mesa.findUnique).mockResolvedValue({ id_ct_mesa: 1 } as any);
      vi.mocked(prisma.ct_mesa.update).mockResolvedValue({ id_ct_mesa: 1, capacidad: 10 } as any);

      const res = await request(app)
        .patch('/api/mesas/1')
        .set('Cookie', getAuthCookie())
        .send({ capacidad: 10 });

      expect(res.status).toBe(200);
      expect(res.body.datos.capacidad).toBe(10);
    });

    it('debe retornar 404 si la mesa no existe', async () => {
      vi.mocked(prisma.ct_mesa.findUnique).mockResolvedValue(null);

      const res = await request(app)
        .patch('/api/mesas/99')
        .set('Cookie', getAuthCookie())
        .send({ capacidad: 10 });

      expect(res.status).toBe(404);
    });
  });
});
