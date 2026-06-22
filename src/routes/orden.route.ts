import { Router } from 'express';
import ordenController from '@/controllers/orden.controller';
import { autenticado } from '@/middlewares/autenticacion.middleware';
import { autorizar } from '@/middlewares/autorizacion.middleware';
import { validar } from '@/middlewares/validar.middlewares';
import {
  crearOrdenSchema,
  actualizarEstadoOrdenSchema,
  actualizarOrdenSchema,
  filtrosOrdenesSchema,
} from '@/schemas/orden.schema';
import { idParamSchema } from '@/schemas/comun.schema';

const router = Router();

router.use(autenticado);

// Rutas de consulta (permiso ORDENES_VER no registrado → libre para autenticados)
router.get('/', validar(filtrosOrdenesSchema), ordenController.obtenerTodos);
router.get('/:id', validar(idParamSchema), ordenController.obtenerPorId);

// Rutas protegidas con permiso configurado en ct_ruta_permiso
router.post('/', autorizar, validar(crearOrdenSchema), ordenController.crear);

router.patch(
  '/:id/estado',
  autorizar,
  validar(actualizarEstadoOrdenSchema),
  ordenController.actualizarEstado,
);

router.put(
  '/:id',
  autorizar,
  validar(actualizarOrdenSchema),
  ordenController.actualizar,
);

router.delete(
  '/:id',
  autorizar,
  validar(idParamSchema),
  ordenController.cancelar,
);

export { router as ordenRouter };
