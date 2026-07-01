import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import archivoController from '@/controllers/archivo.controller';
import { crearSubidor, TIPOS } from '@/utils/archivo.utils';
import { autenticado } from '@/middlewares/autenticacion.middleware';

// ── Instancias de Multer por tipo de archivo ──────────────────────────────────
//
// Cada subidor tiene su propio límite de tamaño y su whitelist de MIME types.
// Se crean una sola vez al cargar el módulo (no por request).
//
// ⚠ Los límites son orientativos para un sistema escolar:
//    - Imágenes pequeñas: fotos de platillos, avatares → 2 MB max
//    - Documentos: PDFs de menús, circulares → 10 MB max
//    - Excel: importación de datos en lote → 5 MB max

const subidores: Record<string, ReturnType<typeof crearSubidor>> = {
  imagenes: crearSubidor({
    destino: 'imagenes',
    maxMB: 2,
    tiposPermitidos: TIPOS.IMAGENES, // jpeg, png, webp, gif
  }),
  documentos: crearSubidor({
    destino: 'documentos',
    maxMB: 10,
    tiposPermitidos: TIPOS.DOCUMENTOS, // pdf, txt, csv
  }),
  excel: crearSubidor({
    destino: 'excel',
    maxMB: 5,
    tiposPermitidos: TIPOS.EXCEL, // xlsx
  }),
};

// ── Middleware selector ───────────────────────────────────────────────────────

/**
 * Selecciona el subidor correcto según el parámetro :subtipo de la URL.
 * Si el subtipo no está registrado, Multer rechaza la petición antes de llegar
 * al controlador y el error llega al middleware global.
 *
 * Usar .single('archivo') significa que el campo del form-data debe llamarse "archivo".
 */
const subirSegunTipo = (
  req: import('express').Request,
  res: import('express').Response,
  next: import('express').NextFunction,
) => {
  const subtipo = req.params['subtipo'] as string | undefined;
  const subidor = subidores[subtipo ?? ''];

  if (!subidor) {
    // Subtipo no soportado → 404 antes de tocar el disco
    res.status(404).json({
      exito: false,
      mensaje: `Tipo de archivo no soportado: ${subtipo}. Use: imagenes, documentos, excel`,
      codigo: 'NOT_FOUND',
    });
    return;
  }

  subidor.single('archivo')(req, res, next);
};

// ── Rate limiter ──────────────────────────────────────────────────────────────

// 20 uploads / 15 min por IP — previene agotamiento de disco por automatización
const limitarSubidas = rateLimit({
  windowMs: 15 * 60 * 1_000,
  max: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    exito: false,
    mensaje: 'Demasiadas subidas de archivos. Intenta de nuevo en 15 minutos.',
    codigo: 'TOO_MANY_REQUESTS',
  },
});

// ── Rutas ─────────────────────────────────────────────────────────────────────

const router = Router();

/**
 * POST /api/v1/archivos/:subtipo
 * Sube un archivo. El campo del form-data debe llamarse "archivo".
 *
 * Subtipos válidos y sus restricciones:
 *   - imagenes   → jpeg/png/webp/gif, máx 2 MB
 *   - documentos → pdf/txt/csv,       máx 10 MB
 *   - excel      → xlsx,              máx 5 MB
 *
 * Ejemplos con curl:
 *   curl -X POST http://localhost:3000/api/archivos/imagenes \
 *        -F "archivo=@foto.jpg"
 *
 *   curl -X POST http://localhost:3000/api/archivos/documentos \
 *        -F "archivo=@menu.pdf"
 *
 * Respuesta:
 *   { nombreArchivo, rutaRelativa, hash, duplicado, tamanioBytes, mimeType }
 */
router.post('/:subtipo', autenticado, limitarSubidas, subirSegunTipo, archivoController.subir);

/**
 * GET /api/archivos/:subtipo/:nombre
 * Sirve el archivo. Imágenes y PDFs se muestran inline por defecto.
 * Añadir ?descargar=1 para forzar la descarga.
 *
 * Ejemplos:
 *   GET /api/archivos/imagenes/d4e5f6.png           → muestra inline
 *   GET /api/archivos/documentos/abc.pdf?descargar=1 → descarga
 */
router.get('/:subtipo/:nombre', autenticado, archivoController.obtener);

/**
 * DELETE /api/v1/archivos/:subtipo/:nombre
 * Elimina el archivo del disco.
 * En producción agregar: autenticado, autorizado('ADMIN')
 *
 * Ejemplo:
 *   DELETE /api/archivos/imagenes/d4e5f6.png
 */
router.delete('/:subtipo/:nombre', autenticado, archivoController.eliminar);

export { router as archivoRouter };
