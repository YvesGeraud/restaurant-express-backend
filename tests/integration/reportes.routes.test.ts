import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('@/utils/ruta-permiso.cache', () => ({
  obtenerPermisoDeRuta:       () => undefined,
  cargarCacheRutaPermisos:    () => Promise.resolve(),
  iniciarRefrescoAutomatico:  () => {},
  invalidarCacheRutaPermisos: () => Promise.resolve(),
  obtenerPermisosDeRol:       () => undefined,
}));

vi.mock('@/config/database.config', () => ({
  prisma: {
    rl_rol_permiso: { findMany: vi.fn() },
    $queryRaw: vi.fn().mockResolvedValue([{ db_health_check: 1 }]),
  },
}));

vi.mock('@/services/reporte.service', () => ({
  default: {
    obtenerEstadisticas:  vi.fn(),
    obtenerDashboardStats: vi.fn(),
  },
}));

import app from '@/setup';
import { prisma } from '@/config/database.config';
import reporteService from '@/services/reporte.service';
import { TODOS_LOS_PERMISOS, getAuthCookie } from '../helpers/permisos.fixture';

const mockStats = {
  ventas_totales: 15000,
  cantidad_ordenes: 42,
  platillo_top: { nombre: 'Tacos al pastor', cantidad: 18 },
};

const mockDashboard = {
  ventas_hoy: 5000,
  total_mesas: 10,
  ordenes_activas: 3,
  top_platillos: [],
  ingresos_7_dias: [],
};

describe('Módulo de Reportes — Rutas de Integración', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.rl_rol_permiso.findMany).mockResolvedValue(TODOS_LOS_PERMISOS as any);
  });

  describe('GET /api/reportes/stats', () => {
    it('401 sin autenticación', async () => {
      const res = await request(app).get('/api/reportes/stats');
      expect(res.status).toBe(401);
    });

    it('200 con estadísticas cuando el usuario está autenticado', async () => {
      vi.mocked(reporteService.obtenerEstadisticas).mockResolvedValue(mockStats as any);

      const res = await request(app)
        .get('/api/reportes/stats')
        .set('Cookie', getAuthCookie());

      expect(res.status).toBe(200);
      expect(res.body.datos).toMatchObject({ ventas_totales: 15000 });
    });

    it('200 acepta filtros de fecha por query string', async () => {
      vi.mocked(reporteService.obtenerEstadisticas).mockResolvedValue(mockStats as any);

      const res = await request(app)
        .get('/api/reportes/stats?fecha_inicio=2025-01-01&fecha_fin=2025-12-31')
        .set('Cookie', getAuthCookie());

      expect(res.status).toBe(200);
      expect(vi.mocked(reporteService.obtenerEstadisticas)).toHaveBeenCalledWith(
        expect.objectContaining({ fecha_inicio: '2025-01-01', fecha_fin: '2025-12-31' }),
      );
    });
  });

  describe('GET /api/reportes/dashboard', () => {
    it('401 sin autenticación', async () => {
      const res = await request(app).get('/api/reportes/dashboard');
      expect(res.status).toBe(401);
    });

    it('200 con datos del dashboard cuando el usuario está autenticado', async () => {
      vi.mocked(reporteService.obtenerDashboardStats).mockResolvedValue(mockDashboard as any);

      const res = await request(app)
        .get('/api/reportes/dashboard')
        .set('Cookie', getAuthCookie());

      expect(res.status).toBe(200);
      expect(res.body.datos).toMatchObject({ total_mesas: 10 });
    });
  });
});
