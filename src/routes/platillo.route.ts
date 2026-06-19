import { Router } from 'express';
import platilloController from '@/controllers/platillo.controller';
import { validar } from '@/middlewares/validar.middlewares';
import { idParamSchema } from '@/schemas/comun.schema';
import {
  crearPlatilloSchema,
  actualizarPlatilloSchema,
  filtrosPlatillosSchema,
  crearPlatillosLoteSchema,
} from '@/schemas/platillo.schema';

import { autenticado } from '@/middlewares/autenticacion.middleware';
import { autorizar } from '@/middlewares/autorizacion.middleware';

const router = Router();

// Rutas públicas
router.get('/', validar(filtrosPlatillosSchema), platilloController.listar);
router.get('/:id', validar(idParamSchema), platilloController.obtenerPorId);

// Rutas protegidas (Requieren login y permiso configurado en ct_ruta_permiso)
// ⚠ /batch DEBE ir antes de /:id — Express interpreta "batch" como un ID si va después
router.post(
  '/batch',
  autenticado,
  autorizar,
  validar(crearPlatillosLoteSchema),
  platilloController.crearLote,
);

router.post(
  '/',
  autenticado,
  autorizar,
  validar(crearPlatilloSchema),
  platilloController.crear,
);

router.patch(
  '/:id',
  autenticado,
  autorizar,
  validar(actualizarPlatilloSchema),
  platilloController.actualizar,
);

router.delete(
  '/:id',
  autenticado,
  autorizar,
  validar(idParamSchema),
  platilloController.eliminar,
);

export { router as platilloRouter };
