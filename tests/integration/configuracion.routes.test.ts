import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Mock de Prisma
vi.mock('@/utils/ruta-permiso.cache', () => ({
  obtenerPermisoDeRuta: (metodo: string, ruta: string) => {
    const mapa: Record<string, string> = {
      'GET:/api/configuracion':   'CONFIG_VER',
      'PATCH:/api/configuracion': 'CONFIG_EDITAR',
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
    ct_configuracion: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
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

const getAuthCookie = (id = 1, rol = 'ADMIN', permisos: string[] = ['CONFIG_VER']) => {
  const token = jwt.sign({ id_ct_usuario: id, usuario: 'admin', rol, permisos }, SECRET, {
    expiresIn: '15m',
  });
  return `accessToken=${token}`;
};

describe('Módulo de Configuración — Rutas de Integración', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock por defecto para permisos
    vi.mocked(prisma.rl_rol_permiso.findMany).mockResolvedValue(TODOS_LOS_PERMISOS as any);
  });

  describe('GET /api/configuracion', () => {
    it('debe retornar la configuración existente', async () => {
      const mockConfig = { id_ct_configuracion: 1, nombre_restaurante: 'Test Rest' };
      vi.mocked(prisma.ct_configuracion.findFirst).mockResolvedValue(mockConfig as any);

      const res = await request(app).get('/api/configuracion').set('Cookie', getAuthCookie());

      expect(res.status).toBe(200);
      expect(res.body.exito).toBe(true);
      expect(res.body.datos.nombre_restaurante).toBe('Test Rest');
    });

    it('debe crear configuración por defecto si no existe', async () => {
      vi.mocked(prisma.ct_configuracion.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.ct_configuracion.create).mockResolvedValue({
        id_ct_configuracion: 1,
        nombre_restaurante: 'Mi Restaurante',
      } as any);

      const res = await request(app).get('/api/configuracion').set('Cookie', getAuthCookie());

      expect(res.status).toBe(200);
      expect(prisma.ct_configuracion.create).toHaveBeenCalled();
    });

    it('debe retornar 403 si el usuario no tiene permisos', async () => {
      vi.mocked(prisma.rl_rol_permiso.findMany).mockResolvedValueOnce([]); // Sin permisos

      const res = await request(app)
        .get('/api/configuracion')
        .set('Cookie', getAuthCookie(2, 'CAJERO', []));

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/configuracion', () => {
    it('debe actualizar la configuración', async () => {
      vi.mocked(prisma.ct_configuracion.findFirst).mockResolvedValue({
        id_ct_configuracion: 1,
      } as any);
      vi.mocked(prisma.ct_configuracion.update).mockResolvedValue({
        id_ct_configuracion: 1,
        nombre_restaurante: 'Nuevo Nombre',
      } as any);

      const res = await request(app)
        .patch('/api/configuracion')
        .set('Cookie', getAuthCookie())
        .send({ nombre_restaurante: 'Nuevo Nombre', moneda: '$', impuesto_porcentaje: 0.16 });

      expect(res.status).toBe(200);
      expect(res.body.datos.nombre_restaurante).toBe('Nuevo Nombre');
      expect(prisma.ct_configuracion.update).toHaveBeenCalled();
    });
  });
});
