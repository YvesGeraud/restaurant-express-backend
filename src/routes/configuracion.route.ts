import { Router } from 'express';
import configuracionController from '@/controllers/configuracion.controller';
import { autenticado } from '@/middlewares/autenticacion.middleware';
import { autorizar } from '@/middlewares/autorizacion.middleware';
import { validar } from '@/middlewares/validar.middlewares';
import { actualizarConfiguracionSchema } from '@/schemas/configuracion.schema';

const router = Router();

// Todas las rutas de configuración requieren estar autenticado
router.use(autenticado);

router.get('/', autorizar, configuracionController.obtener);

router.patch(
  '/',
  autorizar,
  validar(actualizarConfiguracionSchema),
  configuracionController.actualizar,
);

export { router as configuracionRouter };
