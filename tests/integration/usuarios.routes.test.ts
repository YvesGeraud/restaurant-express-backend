import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// Mock de Prisma
vi.mock('@/utils/ruta-permiso.cache', () => ({
  obtenerPermisoDeRuta: (metodo: string, ruta: string) => {
    const mapa: Record<string, string> = {
      'GET:/api/usuarios':    'USUARIOS_VER',
      'POST:/api/usuarios':   'USUARIOS_CREAR',
      'PATCH:/api/usuarios':  'USUARIOS_EDITAR',
      'DELETE:/api/usuarios': 'USUARIOS_BORRAR',
      'PUT:/api/usuarios':    'USUARIOS_EDITAR',
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
    ct_usuario: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    ct_rol: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
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

const getAuthCookie = (
  id = 1,
  rol = 'ADMIN',
  permisos: string[] = ['USUARIOS_VER', 'USUARIOS_EDITAR'],
) => {
  const token = jwt.sign({ id_ct_usuario: id, usuario: 'admin', rol, permisos }, SECRET, {
    expiresIn: '15m',
  });
  return `accessToken=${token}`;
};

describe('Módulo de Usuarios — Rutas de Integración', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock por defecto para permisos
    vi.mocked(prisma.rl_rol_permiso.findMany).mockResolvedValue(TODOS_LOS_PERMISOS as any);

    // Mock findFirst como null por defecto para evitar errores en service.crear
    vi.mocked(prisma.ct_usuario.findFirst).mockResolvedValue(null);
  });

  describe('GET /api/usuarios', () => {
    it('debe retornar lista de usuarios paginada excluyendo contraseñas', async () => {
      const mockUsuarios = [
        { id_ct_usuario: 1, usuario: 'admin1', estado: true, ct_rol: { nombre: 'ADMIN' } },
      ];

      vi.mocked(prisma.ct_usuario.findMany).mockResolvedValue(mockUsuarios as any);
      vi.mocked(prisma.ct_usuario.count).mockResolvedValue(1);

      const res = await request(app).get('/api/usuarios').set('Cookie', getAuthCookie());

      expect(res.status).toBe(200);
      expect(res.body.exito).toBe(true);
      expect(res.body.datos[0]).not.toHaveProperty('contrasena');
      expect(res.body.meta.totalRegistros).toBe(1);
    });
  });

  describe('GET /api/usuarios/roles', () => {
    it('debe listar los roles disponibles', async () => {
      const mockRoles = [{ id_ct_rol: 1, nombre: 'ADMIN' }];
      vi.mocked(prisma.ct_rol.findMany).mockResolvedValue(mockRoles as any);

      const res = await request(app).get('/api/usuarios/roles').set('Cookie', getAuthCookie());

      expect(res.status).toBe(200);
      expect(res.body.datos).toHaveLength(1);
    });
  });

  describe('POST /api/usuarios', () => {
    const nuevoUsuario = {
      usuario: 'nuevoUser',
      contrasena: 'Pass1234!',
      nombre_completo: 'Nuevo Usuario',
      id_ct_rol: 2,
    };

    it('debe crear un usuario y hashear su contraseña', async () => {
      vi.mocked(prisma.ct_usuario.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.ct_rol.findUnique).mockResolvedValue({
        id_ct_rol: 2,
        nombre: 'CAJERO',
      } as any);

      let passwordHasheada = '';
      vi.mocked(prisma.ct_usuario.create).mockImplementation(async (args: any) => {
        passwordHasheada = args.data.contrasena;
        return {
          id_ct_usuario: 2,
          usuario: 'nuevoUser',
          nombre_completo: 'Nuevo Usuario',
          id_ct_rol: 2,
          estado: true,
          fecha_reg: new Date(),
          ct_rol: { nombre: 'CAJERO' },
        } as any;
      });

      const res = await request(app)
        .post('/api/usuarios')
        .set('Cookie', getAuthCookie())
        .send(nuevoUsuario);

      expect(res.status).toBe(201);
      expect(res.body.datos.usuario).toBe('nuevoUser');

      // Verificar que bcrypt actuó comparando con el texto plano
      const isValid = await bcrypt.compare('Pass1234!', passwordHasheada);
      expect(isValid).toBe(true);
    });

    it('debe retornar 409 si el nombre de usuario ya existe', async () => {
      vi.mocked(prisma.ct_usuario.findFirst).mockResolvedValue({
        id_ct_usuario: 1,
        usuario: 'nuevoUser',
      } as any);

      const res = await request(app)
        .post('/api/usuarios')
        .set('Cookie', getAuthCookie())
        .send(nuevoUsuario);

      expect(res.status).toBe(409);
    });
  });

  describe('PATCH /api/usuarios/:id', () => {
    it('debe actualizar un usuario existente', async () => {
      vi.mocked(prisma.ct_usuario.findUnique).mockResolvedValue({ id_ct_usuario: 2 } as any);
      vi.mocked(prisma.ct_rol.findUnique).mockResolvedValue({ id_ct_rol: 2 } as any);

      vi.mocked(prisma.ct_usuario.update).mockResolvedValue({
        id_ct_usuario: 2,
        nombre_completo: 'Nombre Editado',
        ct_rol: { nombre: 'CAJERO' },
      } as any);

      const res = await request(app)
        .patch('/api/usuarios/2')
        .set('Cookie', getAuthCookie())
        .send({ nombre_completo: 'Nombre Editado' });

      expect(res.status).toBe(200);
      expect(res.body.datos.nombre_completo).toBe('Nombre Editado');
    });
  });

  describe('DELETE /api/usuarios/:id', () => {
    it('debe desactivar un usuario', async () => {
      vi.mocked(prisma.ct_usuario.findUnique).mockResolvedValue({
        id_ct_usuario: 2,
        estado: true,
        ct_rol: { nombre: 'CAJERO' },
      } as any);
      vi.mocked(prisma.ct_usuario.update).mockResolvedValue({
        id_ct_usuario: 2,
        estado: false,
      } as any);

      const res = await request(app).delete('/api/usuarios/2').set('Cookie', getAuthCookie());

      expect(res.status).toBe(200);
    });
  });
});
