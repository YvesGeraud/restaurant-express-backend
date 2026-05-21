/**
 * Centraliza todos los mensajes de respuesta de la API.
 * Facilita el mantenimiento, consistencia y futura internacionalización (i18n).
 */
export const MSG = {
  // ── Entidades Generales ─────────────────────────────────────────────────────
  ERROR_NO_ENCONTRADO: (entidad: string) => `${entidad} no fue encontrado(a) en el sistema.`,
  ERROR_YA_EXISTE: (entidad: string) => `Ya existe un registro con esos datos para ${entidad}.`,
  ERROR_CREAR: (entidad: string) => `Ocurrió un error al intentar crear el/la ${entidad}.`,
  ERROR_ACTUALIZAR: (entidad: string) =>
    `Ocurrió un error al intentar actualizar el/la ${entidad}.`,
  ERROR_ELIMINAR: (entidad: string) => `Ocurrió un error al intentar eliminar el/la ${entidad}.`,
  EXITO_CREAR: (entidad: string) => `${entidad} creado(a) con éxito.`,
  EXITO_ACTUALIZAR: (entidad: string) => `${entidad} actualizado(a) con éxito.`,
  EXITO_ELIMINAR: (entidad: string) => `${entidad} eliminado(a) con éxito.`,

  // ── Autenticación y Sesión ──────────────────────────────────────────────────
  AUTH_EXITO: 'Sesión iniciada correctamente. ¡Bienvenido!',
  AUTH_ERROR_CREDENCIALES: 'Usuario o contraseña incorrectos. Por favor, verifica tus datos.',
  AUTH_TOKEN_INVALIDO:
    'Tu sesión ha expirado o el token es inválido. Por favor, inicia sesión de nuevo.',
  AUTH_SIN_PERMISOS: 'No tienes los permisos necesarios para realizar esta acción.',
  AUTH_USUARIO_INACTIVO: 'Tu cuenta se encuentra inactiva. Contacta al administrador.',
  AUTH_LOGOUT: 'Sesión cerrada correctamente.',

  // ── Archivos y Documentos ───────────────────────────────────────────────────
  FILE_UPLOAD_EXITO: 'Archivo subido y procesado correctamente.',
  FILE_ERROR_TAMAÑO: 'El archivo excede el tamaño máximo permitido.',
  FILE_ERROR_EXTENSION: 'El formato del archivo no es válido o no está permitido.',
  FILE_ERROR_VACIO: 'No se ha seleccionado ningún archivo para subir.',

  // ── Errores de Sistema / Genéricos ──────────────────────────────────────────
  ERROR_INTERNO: 'Ocurrió un error interno en el servidor. Por favor, intenta más tarde.',
  ERROR_BAD_REQUEST: 'La solicitud no pudo ser procesada debido a datos inválidos.',
  ERROR_DATABASE: 'Error en la comunicación con la base de datos.',

  // ── Validaciones (Zod) ──────────────────────────────────────────────────────
  VAL_REQUERIDO: (campo: string) => `El campo ${campo} es obligatorio.`,
  VAL_MIN: (campo: string, min: number) =>
    `El campo ${campo} debe tener al menos ${min} caracteres.`,
  VAL_MAX: (campo: string, max: number) =>
    `El campo ${campo} no puede exceder los ${max} caracteres.`,
  VAL_EMAIL: 'El formato del correo electrónico no es válido.',
  VAL_TELEFONO_INVALIDO: 'El formato del número de teléfono no es válido (debe tener entre 8 y 20 dígitos).',
} as const;

export type MessageKey = keyof typeof MSG;
