import { Router } from 'express';
import clienteController from '@/controllers/cliente.controller';
import { autenticado } from '@/middlewares/autenticacion.middleware';
import { autorizar } from '@/middlewares/autorizacion.middleware';
import { validar } from '@/middlewares/validar.middlewares';
import {
  crearClienteSchema,
  actualizarClienteSchema,
  filtrosClientesSchema,
} from '@/schemas/cliente.schema';
import { idParamSchema } from '@/schemas/comun.schema';

const router = Router();

// Todas las rutas de clientes requieren estar autenticado
router.use(autenticado);

router.get(
  '/',
  autorizar,
  validar(filtrosClientesSchema),
  clienteController.listar,
);

router.get(
  '/:id',
  autorizar,
  validar(idParamSchema),
  clienteController.obtenerPorId,
);

router.post(
  '/',
  autorizar,
  validar(crearClienteSchema),
  clienteController.crear,
);

router.patch(
  '/:id',
  autorizar,
  validar(actualizarClienteSchema),
  clienteController.actualizar,
);

router.delete(
  '/:id',
  autorizar,
  validar(idParamSchema),
  clienteController.eliminar,
);

export { router as clienteRouter };
