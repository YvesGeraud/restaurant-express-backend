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

vi.mock('@/services/excel.service', () => ({
  default: {
    menuDelDia:    vi.fn(),
    reporteVentas: vi.fn(),
  },
}));

import app from '@/setup';
import { prisma } from '@/config/database.config';
import excelService from '@/services/excel.service';
import { TODOS_LOS_PERMISOS, getAuthCookie } from '../helpers/permisos.fixture';

const CONTENT_TYPE_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

describe('Módulo de Excel — Rutas de Integración', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.rl_rol_permiso.findMany).mockResolvedValue(TODOS_LOS_PERMISOS as any);

    vi.mocked(excelService.menuDelDia).mockImplementation(async (res: any) => {
      res.setHeader('Content-Type', CONTENT_TYPE_XLSX);
      res.setHeader('Content-Disposition', 'attachment; filename="menu.xlsx"');
      res.status(200).end(Buffer.from('fake-xlsx-data'));
    });

    vi.mocked(excelService.reporteVentas).mockImplementation(async (res: any) => {
      res.setHeader('Content-Type', CONTENT_TYPE_XLSX);
      res.setHeader('Content-Disposition', 'attachment; filename="ventas.xlsx"');
      res.status(200).end(Buffer.from('fake-xlsx-data'));
    });
  });

  describe('GET /api/excel/menu', () => {
    it('200 sin autenticación — menú es público', async () => {
      const res = await request(app).get('/api/excel/menu');
      expect(res.status).toBe(200);
    });

    it('responde con Content-Type xlsx', async () => {
      const res = await request(app).get('/api/excel/menu');
      expect(res.headers['content-type']).toContain(CONTENT_TYPE_XLSX);
    });
  });

  describe('GET /api/excel/ventas', () => {
    it('401 sin autenticación', async () => {
      const res = await request(app).get('/api/excel/ventas');
      expect(res.status).toBe(401);
    });

    it('200 con autenticación y Content-Type xlsx', async () => {
      const res = await request(app)
        .get('/api/excel/ventas')
        .set('Cookie', getAuthCookie());

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain(CONTENT_TYPE_XLSX);
    });

    it('pasa los filtros de query string al servicio', async () => {
      await request(app)
        .get('/api/excel/ventas?fecha_inicio=2025-01-01&fecha_fin=2025-12-31')
        .set('Cookie', getAuthCookie());

      expect(vi.mocked(excelService.reporteVentas)).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ fecha_inicio: '2025-01-01', fecha_fin: '2025-12-31' }),
      );
    });
  });
});
