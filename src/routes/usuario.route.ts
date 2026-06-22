import { Router } from 'express';
import usuarioController from '@/controllers/usuario.controller';
import { autenticado } from '@/middlewares/autenticacion.middleware';
import { autorizar } from '@/middlewares/autorizacion.middleware';
import { validar } from '@/middlewares/validar.middlewares';
import {
  crearUsuarioSchema,
  actualizarUsuarioSchema,
  filtrosUsuariosSchema,
} from '@/schemas/usuario.schema';
import { idParamSchema } from '@/schemas/comun.schema';

const router = Router();

// Todas las rutas de usuarios requieren estar autenticado
router.use(autenticado);

// Gestión de Roles y Permisos (para llenar selects en el front y administración)
router.get('/roles', usuarioController.listarRoles);
router.get('/permisos', autorizar, usuarioController.listarPermisos);
router.get('/roles/:id/permisos', autorizar, usuarioController.obtenerPermisosRol);
router.put('/roles/:id/permisos', autorizar, usuarioController.actualizarPermisosRol);

// CRUD de Usuarios
router.get(
  '/',
  autorizar,
  validar(filtrosUsuariosSchema),
  usuarioController.listar,
);

router.get(
  '/:id',
  autorizar,
  validar(idParamSchema),
  usuarioController.obtenerPorId,
);

router.post(
  '/',
  autorizar,
  validar(crearUsuarioSchema),
  usuarioController.crear,
);

router.patch(
  '/:id',
  autorizar,
  validar(actualizarUsuarioSchema),
  usuarioController.actualizar,
);

router.delete(
  '/:id',
  autorizar,
  validar(idParamSchema),
  usuarioController.eliminar,
);

export { router as usuarioRouter };
