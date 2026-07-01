import jwt from 'jsonwebtoken';

export const TODOS_LOS_PERMISOS = [
  { ct_permiso: { codigo: 'USUARIOS_VER' } },
  { ct_permiso: { codigo: 'USUARIOS_CREAR' } },
  { ct_permiso: { codigo: 'USUARIOS_EDITAR' } },
  { ct_permiso: { codigo: 'USUARIOS_BORRAR' } },
  { ct_permiso: { codigo: 'CLIENTES_VER' } },
  { ct_permiso: { codigo: 'CLIENTES_CREAR' } },
  { ct_permiso: { codigo: 'CLIENTES_EDITAR' } },
  { ct_permiso: { codigo: 'CLIENTES_BORRAR' } },
  { ct_permiso: { codigo: 'PLATILLOS_VER' } },
  { ct_permiso: { codigo: 'PLATILLOS_CREAR' } },
  { ct_permiso: { codigo: 'PLATILLOS_EDITAR' } },
  { ct_permiso: { codigo: 'PLATILLOS_BORRAR' } },
  { ct_permiso: { codigo: 'MESAS_VER' } },
  { ct_permiso: { codigo: 'MESAS_CREAR' } },
  { ct_permiso: { codigo: 'MESAS_EDITAR' } },
  { ct_permiso: { codigo: 'MESAS_BORRAR' } },
  { ct_permiso: { codigo: 'CONFIG_VER' } },
  { ct_permiso: { codigo: 'CONFIG_EDITAR' } },
  { ct_permiso: { codigo: 'RESERVACIONES_VER' } },
  { ct_permiso: { codigo: 'RESERVACIONES_CREAR' } },
  { ct_permiso: { codigo: 'RESERVACIONES_EDITAR' } },
  { ct_permiso: { codigo: 'RESERVACIONES_BORRAR' } },
  { ct_permiso: { codigo: 'ORDENES_CREAR' } },
  { ct_permiso: { codigo: 'ORDENES_ESTADO' } },
  { ct_permiso: { codigo: 'ORDENES_CANCELAR' } },
];

export const getAuthCookie = (
  id = 1,
  rol = 'ADMIN',
  permisos: string[] = Object.values(TODOS_LOS_PERMISOS).map((p) => p.ct_permiso.codigo),
): string => {
  const token = jwt.sign({ id_ct_usuario: id, usuario: 'admin', rol, permisos }, process.env['JWT_SECRET']!, {
    expiresIn: '15m',
  });
  return `accessToken=${token}`;
};
