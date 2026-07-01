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

vi.mock('@/services/pdf.service', () => ({
  default: {
    menuDelDia:    vi.fn(),
    reporteVentas: vi.fn(),
  },
}));

import app from '@/setup';
import { prisma } from '@/config/database.config';
import pdfService from '@/services/pdf.service';
import { TODOS_LOS_PERMISOS, getAuthCookie } from '../helpers/permisos.fixture';

describe('Módulo de PDF — Rutas de Integración', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.rl_rol_permiso.findMany).mockResolvedValue(TODOS_LOS_PERMISOS as any);

    vi.mocked(pdfService.menuDelDia).mockImplementation(async (res: any) => {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="menu.pdf"');
      res.status(200).end(Buffer.from('%PDF-1.4 fake'));
    });

    vi.mocked(pdfService.reporteVentas).mockImplementation(async (res: any) => {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="ventas.pdf"');
      res.status(200).end(Buffer.from('%PDF-1.4 fake'));
    });
  });

  describe('GET /api/pdf/menu', () => {
    it('200 sin autenticación — menú es público', async () => {
      const res = await request(app).get('/api/pdf/menu');
      expect(res.status).toBe(200);
    });

    it('responde con Content-Type application/pdf', async () => {
      const res = await request(app).get('/api/pdf/menu');
      expect(res.headers['content-type']).toContain('application/pdf');
    });
  });

  describe('GET /api/pdf/ventas', () => {
    it('401 sin autenticación', async () => {
      const res = await request(app).get('/api/pdf/ventas');
      expect(res.status).toBe(401);
    });

    it('200 con autenticación y Content-Type application/pdf', async () => {
      const res = await request(app)
        .get('/api/pdf/ventas')
        .set('Cookie', getAuthCookie());

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    });

    it('pasa los filtros de query string al servicio', async () => {
      await request(app)
        .get('/api/pdf/ventas?fecha_inicio=2025-01-01&fecha_fin=2025-12-31')
        .set('Cookie', getAuthCookie());

      expect(vi.mocked(pdfService.reporteVentas)).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ fecha_inicio: '2025-01-01', fecha_fin: '2025-12-31' }),
      );
    });
  });
});
