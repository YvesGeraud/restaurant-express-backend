import { Router } from 'express';
import mesaController from '@/controllers/mesa.controller';
import { autenticado } from '@/middlewares/autenticacion.middleware';
import { tienePermiso } from '@/middlewares/autorizacion.middleware';
import { validar } from '@/middlewares/validar.middlewares';
import { crearMesaSchema, actualizarMesaSchema, filtrosMesasSchema } from '@/schemas/mesa.schema';
import { idParamSchema } from '@/schemas/comun.schema';

const router = Router();

// Rutas públicas (para poder seleccionar mesa en formulario público)
router.get('/', validar(filtrosMesasSchema), mesaController.listar);
router.get('/:id', validar(idParamSchema), mesaController.obtenerPorId);

// Rutas administrativas protegidas
router.use(autenticado);

router.post(
  '/',
  tienePermiso('CONFIG_VER'), // Usamos un permiso de gestión/config para mesas
  validar(crearMesaSchema),
  mesaController.crear,
);

router.patch(
  '/:id',
  tienePermiso('CONFIG_VER'),
  validar(actualizarMesaSchema),
  mesaController.actualizar,
);

router.delete('/:id', tienePermiso('CONFIG_VER'), validar(idParamSchema), mesaController.eliminar);

export { router as mesaRouter };
