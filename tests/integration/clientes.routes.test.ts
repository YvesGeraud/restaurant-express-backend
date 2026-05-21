import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Mock de Prisma
vi.mock('@/config/database.config', () => ({
  prisma: {
    ct_cliente: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    rl_rol_permiso: {
      findMany: vi.fn(),
    },
  },
}));

import app from '@/setup';
import { prisma } from '@/config/database.config';

const SECRET = process.env['JWT_SECRET']!;

const getAuthCookie = (
  id = 1,
  rol = 'ADMIN',
  permisos: string[] = ['CLIENTES_VER', 'CLIENTES_EDITAR'],
) => {
  const token = jwt.sign({ id_ct_usuario: id, usuario: 'admin', rol, permisos }, SECRET, {
    expiresIn: '15m',
  });
  return `accessToken=${token}`;
};

describe('Módulo de Clientes — Rutas de Integración', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock por defecto para permisos
    vi.mocked(prisma.rl_rol_permiso.findMany).mockResolvedValue([
      { ct_permiso: { codigo: 'USUARIOS_VER' } },
      { ct_permiso: { codigo: 'USUARIOS_CREAR' } },
      { ct_permiso: { codigo: 'USUARIOS_EDITAR' } },
      { ct_permiso: { codigo: 'USUARIOS_BORRAR' } },
      { ct_permiso: { codigo: 'CLIENTES_VER' } },
      { ct_permiso: { codigo: 'CLIENTES_CREAR' } },
      { ct_permiso: { codigo: 'CLIENTES_EDITAR' } },
      { ct_permiso: { codigo: 'CLIENTES_BORRAR' } },
      { ct_permiso: { codigo: 'PLATILLOS_VER' } },
      { ct_permiso: { codigo: 'PLATILLOS_CREAR' } },
      { ct_permiso: { codigo: 'PLATILLOS_EDITAR' } },
      { ct_permiso: { codigo: 'PLATILLOS_BORRAR' } },
      { ct_permiso: { codigo: 'MESAS_VER' } },
      { ct_permiso: { codigo: 'MESAS_CREAR' } },
      { ct_permiso: { codigo: 'MESAS_EDITAR' } },
      { ct_permiso: { codigo: 'MESAS_BORRAR' } },
      { ct_permiso: { codigo: 'CONFIG_VER' } },
      { ct_permiso: { codigo: 'CONFIG_EDITAR' } },
      { ct_permiso: { codigo: 'RESERVACIONES_VER' } },
      { ct_permiso: { codigo: 'RESERVACIONES_CREAR' } },
      { ct_permiso: { codigo: 'RESERVACIONES_EDITAR' } },
      { ct_permiso: { codigo: 'RESERVACIONES_BORRAR' } },
      { ct_permiso: { codigo: 'ORDENES_CREAR' } },
      { ct_permiso: { codigo: 'ORDENES_ESTADO' } },
      { ct_permiso: { codigo: 'ORDENES_CANCELAR' } },
    ] as any);

    // Mock findFirst como null por defecto
    vi.mocked(prisma.ct_cliente.findFirst).mockResolvedValue(null);
  });

  describe('GET /api/clientes', () => {
    it('debe retornar lista de clientes paginada para usuario autenticado con permiso', async () => {
      const mockClientes = [
        { id_ct_cliente: 1, nombre: 'Juan', correo: 'juan@test.com', estado: true },
      ];

      vi.mocked(prisma.ct_cliente.findMany).mockResolvedValue(mockClientes as any);
      vi.mocked(prisma.ct_cliente.count).mockResolvedValue(1);

      const res = await request(app).get('/api/clientes').set('Cookie', getAuthCookie());

      expect(res.status).toBe(200);
      expect(res.body.exito).toBe(true);
      expect(res.body.datos).toHaveLength(1);
      expect(res.body.meta.totalRegistros).toBe(1);
    });

    it('debe retornar 403 si el usuario no tiene permisos', async () => {
      vi.mocked(prisma.rl_rol_permiso.findMany).mockResolvedValueOnce([]); // Sin permisos

      const res = await request(app)
        .get('/api/clientes')
        .set('Cookie', getAuthCookie(2, 'CAJERO', []));

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/clientes', () => {
    const nuevoCliente = { nombre: 'Maria', correo: 'maria@test.com', telefono: '1234567890' };

    it('debe crear un cliente si no hay duplicado', async () => {
      vi.mocked(prisma.ct_cliente.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.ct_cliente.create).mockResolvedValue({
        id_ct_cliente: 2,
        ...nuevoCliente,
        estado: true,
        fecha_reg: new Date(),
      } as any);

      const res = await request(app)
        .post('/api/clientes')
        .set('Cookie', getAuthCookie())
        .send(nuevoCliente);

      expect(res.status).toBe(201);
      expect(res.body.datos.correo).toBe('maria@test.com');
    });

    it('debe retornar 409 si el correo ya está registrado', async () => {
      vi.mocked(prisma.ct_cliente.findFirst).mockResolvedValue({ id_ct_cliente: 1 } as any);

      const res = await request(app)
        .post('/api/clientes')
        .set('Cookie', getAuthCookie())
        .send(nuevoCliente);

      expect(res.status).toBe(409);
    });
  });

  describe('PATCH /api/clientes/:id', () => {
    it('debe actualizar un cliente existente', async () => {
      vi.mocked(prisma.ct_cliente.findUnique).mockResolvedValue({ id_ct_cliente: 1 } as any);
      vi.mocked(prisma.ct_cliente.update).mockResolvedValue({
        id_ct_cliente: 1,
        nombre: 'Juan Modificado',
      } as any);

      const res = await request(app)
        .patch('/api/clientes/1')
        .set('Cookie', getAuthCookie())
        .send({ nombre: 'Juan Modificado' });

      expect(res.status).toBe(200);
      expect(res.body.datos.nombre).toBe('Juan Modificado');
    });
  });

  describe('DELETE /api/clientes/:id', () => {
    it('debe desactivar el cliente (soft delete)', async () => {
      vi.mocked(prisma.ct_cliente.findUnique).mockResolvedValue({
        id_ct_cliente: 1,
        estado: true,
      } as any);
      vi.mocked(prisma.ct_cliente.update).mockResolvedValue({
        id_ct_cliente: 1,
        estado: false,
      } as any);

      const res = await request(app).delete('/api/clientes/1').set('Cookie', getAuthCookie());

      expect(res.status).toBe(200);
      expect(prisma.ct_cliente.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ estado: false }),
        }),
      );
    });
  });
});
