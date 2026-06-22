import { Prisma } from '@prisma/client';
import { prisma } from '@/config/database.config';
import { buscarOError } from '@/utils/prisma.utils';
import { paginar } from '@/utils/paginacion.utils';
import type { OpcionesPaginacion } from '@/utils/paginacion.utils';
import type { ResultadoPaginado } from '@/types';
import type {
  CrearOrdenDTO,
  ActualizarEstadoOrdenDTO,
  ActualizarOrdenDTO,
  FiltrosOrdenes,
} from '@/schemas/orden.schema';
import { CAMPOS_ORDENABLES_ORDEN } from '@/schemas/orden.schema';
import { PAGINACION } from '@/constants';
import { ErrorValidacion } from '@/utils/errores.utils';
import { pubsub, EVENTO_ORDEN_NUEVA, EVENTO_ORDEN_ACTUALIZADA } from '@/graphql/pubsub';

// ── Include preciso para devolver órdenes con sus detalles ────────────────────

const INCLUDE_ORDEN_COMPLETA = {
  dt_detalle_orden: {
    include: {
      ct_platillo: {
        select: {
          id_ct_platillo: true,
          nombre: true,
          precio: true,
          imagen_url: true,
        },
      },
    },
  },

  usuario: {
    select: {
      id_ct_usuario: true,
      nombre_completo: true,
    },
  },

  ct_mesa: {
    select: {
      id_ct_mesa: true,
      codigo: true,
      capacidad: true,
      status: true,
      estado: true,
    },
  },
} as const;

type OrdenCompleta = Prisma.rl_ordenGetPayload<{
  include: typeof INCLUDE_ORDEN_COMPLETA;
}>;

class OrdenService {
  async obtenerTodos(filtros: FiltrosOrdenes): Promise<ResultadoPaginado<OrdenCompleta>> {
    const opciones: OpcionesPaginacion = {
      pagina: Number(filtros.pagina) || PAGINACION.PAGINA_POR_DEFECTO,
      limite: Number(filtros.limite) || PAGINACION.LIMITE_POR_DEFECTO,
      ordenarPor: filtros.ordenar_por ?? CAMPOS_ORDENABLES_ORDEN[0],
      orden: filtros.orden ?? 'desc', // Por defecto, mostrar las más recientes primero
    };

    const where: Prisma.rl_ordenWhereInput = {};

    if (filtros.id_ct_usuario !== undefined) {
      where.id_ct_usuario = Number(filtros.id_ct_usuario);
    }
    if (filtros.id_mesa !== undefined) {
      where.id_ct_mesa = Number(filtros.id_mesa);
    }
    if (filtros.estado !== undefined) {
      where.estado = filtros.estado;
    }

    if (filtros.fecha_inicio || filtros.fecha_fin) {
      where.fecha_reg = {};
      if (filtros.fecha_inicio) where.fecha_reg.gte = new Date(filtros.fecha_inicio);
      if (filtros.fecha_fin) where.fecha_reg.lte = new Date(filtros.fecha_fin);
    }

    return paginar(prisma.rl_orden, where, opciones, INCLUDE_ORDEN_COMPLETA) as Promise<
      ResultadoPaginado<OrdenCompleta>
    >;
  }

  async obtenerPorId(id: number): Promise<OrdenCompleta> {
    return buscarOError(
      prisma.rl_orden.findUnique({
        where: { id_rl_orden: id },
        include: INCLUDE_ORDEN_COMPLETA,
      }),
      'Orden',
    );
  }

  /**
   * Crear una orden completa.
   * Representa una verdadera LÓGICA DE NEGOCIO usando transacciones
   * para escribir en múltiples tablas de forma atómica.
   *
   * @example
   * POST /api/ordenes
   * Body:
   * {
   *   "id_mesa": 5,
   *   "detalles": [
   *     { "id_ct_platillo": 1, "cantidad": 2 },
   *     { "id_ct_platillo": 3, "cantidad": 1 }
   *   ]
   * }
   */
  async crearOrdenCompleta(
    id_ct_usuario_reg: number,
    id_ct_usuario: number,
    datos: CrearOrdenDTO,
  ): Promise<OrdenCompleta> {
    // 1. Extraer los IDs únicos de platillos solicitados
    const idsPlatillos = datos.detalles.map((d) => d.id_ct_platillo);

    // 2. Transacción de Prisma para asegurar integridad
    return await prisma.$transaction(async (tx) => {
      // 3. Consultar todos los platillos válidos y activos
      const platillosDb = await tx.ct_platillo.findMany({
        where: {
          id_ct_platillo: { in: idsPlatillos },
          estado: true,
        },
      });

      // 4. Validar que todos los platillos solicitados existan y estén activos
      if (platillosDb.length !== idsPlatillos.length) {
        const idsEncontrados = platillosDb.map((p) => p.id_ct_platillo);
        const faltantes = idsPlatillos.filter((id) => !idsEncontrados.includes(id));
        throw new ErrorValidacion(
          `Los platillos con ID [${faltantes.join(', ')}] no existen o están inactivos.`,
        );
      }

      // Crear un mapa para búsqueda rápida del precio
      const mapaPlatillos = new Map(platillosDb.map((p) => [p.id_ct_platillo, p.precio]));

      // 5. Calcular los subtotales y el gran total desde el backend (por seguridad)
      let totalOrden = 0;
      const detallesAInsertar: Prisma.dt_detalle_ordenCreateManyRl_ordenInput[] =
        datos.detalles.map((detalle) => {
          const precioUnitario = Number(mapaPlatillos.get(detalle.id_ct_platillo));
          const subtotal = precioUnitario * detalle.cantidad;
          totalOrden += subtotal;

          return {
            id_ct_platillo: detalle.id_ct_platillo,
            cantidad: detalle.cantidad,
            precio_unitario: precioUnitario,
            subtotal: subtotal,
            id_ct_usuario_reg,
          };
        });

      // 6. Crear la Orden (Cabecera) junto con sus Detalles simultáneamente
      const nuevaOrden = await tx.rl_orden.create({
        data: {
          id_ct_usuario,
          id_ct_mesa: datos.id_mesa,
          id_ct_usuario_reg,
          estado: 'PENDIENTE',
          total: totalOrden,
          dt_detalle_orden: {
            createMany: {
              data: detallesAInsertar,
            },
          },
        },
        include: INCLUDE_ORDEN_COMPLETA,
      });

      // Publicar evento vía PubSub (reemplaza socket.io)
      void pubsub.publish(EVENTO_ORDEN_NUEVA, { ordenNueva: nuevaOrden });

      return nuevaOrden;
    });
  }

  /**
   * Actualiza únicamente el estado de la orden.
   * Valida la existencia de la orden y retorna la orden completa modificada.
   *
   * @example
   * PATCH /api/ordenes/12/estado
   * Body: { "estado": "EN_PROCESO" }
   */
  async actualizarEstado(
    id_ct_usuario_mod: number,
    id_rl_orden: number,
    datos: ActualizarEstadoOrdenDTO,
  ): Promise<OrdenCompleta> {
    // 1. Validar que exista la orden
    await buscarOError(prisma.rl_orden.findUnique({ where: { id_rl_orden } }), 'Orden');

    // 2. Actualizar estado
    const ordenModificada = await prisma.rl_orden.update({
      where: { id_rl_orden },
      data: { estado: datos.estado, id_ct_usuario_mod, fecha_mod: new Date() },
      include: INCLUDE_ORDEN_COMPLETA,
    });

    // Publicar evento vía PubSub (reemplaza socket.io)
    void pubsub.publish(EVENTO_ORDEN_ACTUALIZADA, { ordenActualizada: ordenModificada });

    return ordenModificada;
  }

  /**
   * Cancela una orden cambiando su estado a CANCELADO.
   * Esto funciona como un soft delete para las órdenes.
   */
  async cancelar(id_ct_usuario_mod: number, id_rl_orden: number): Promise<OrdenCompleta> {
    // Reutilizamos la lógica de actualizar estado
    return this.actualizarEstado(id_ct_usuario_mod, id_rl_orden, { estado: 'CANCELADO' });
  }

  /**
   * Actualizar una orden completa (Mesa y Detalles).
   * Solo permitido si la orden está en estado PENDIENTE.
   */
  async actualizar(
    id_ct_usuario_mod: number,
    id_rl_orden: number,
    datos: ActualizarOrdenDTO,
  ): Promise<OrdenCompleta> {
    // 1. Validar existencia y estado (Solo PENDIENTE se puede editar detalles)
    const ordenDb = await buscarOError(
      prisma.rl_orden.findUnique({ where: { id_rl_orden } }),
      'Orden',
    );

    if (ordenDb.estado !== 'PENDIENTE' && datos.detalles) {
      throw new ErrorValidacion(
        'No se pueden editar los platillos de una orden que ya está en proceso.',
      );
    }

    return await prisma.$transaction(async (tx) => {
      let totalOrden = Number(ordenDb.total);

      // 2. Si se envían detalles, reemplazarlos todos
      if (datos.detalles) {
        // Validar platillos
        const idsPlatillos = datos.detalles.map((d) => d.id_ct_platillo);
        const platillosDb = await tx.ct_platillo.findMany({
          where: { id_ct_platillo: { in: idsPlatillos }, estado: true },
        });

        if (platillosDb.length !== idsPlatillos.length) {
          throw new ErrorValidacion('Uno o más platillos no existen o están inactivos.');
        }

        const mapaPlatillos = new Map(platillosDb.map((p) => [p.id_ct_platillo, p.precio]));

        // Eliminar detalles anteriores
        await tx.dt_detalle_orden.deleteMany({ where: { id_rl_orden } });

        // Calcular nuevo total y preparar nuevos detalles
        totalOrden = 0;
        const detallesNuevos = datos.detalles.map((detalle) => {
          const precioUnitario = Number(mapaPlatillos.get(detalle.id_ct_platillo));
          const subtotal = precioUnitario * detalle.cantidad;
          totalOrden += subtotal;

          return {
            id_rl_orden,
            id_ct_platillo: detalle.id_ct_platillo,
            cantidad: detalle.cantidad,
            precio_unitario: precioUnitario,
            subtotal: subtotal,
            id_ct_usuario_reg: id_ct_usuario_mod,
          };
        });

        // Insertar nuevos detalles
        await tx.dt_detalle_orden.createMany({ data: detallesNuevos });
      }

      // 3. Actualizar Cabecera
      return await tx.rl_orden.update({
        where: { id_rl_orden },
        data: {
          id_ct_mesa: datos.id_mesa !== undefined ? datos.id_mesa : undefined,
          total: totalOrden,
          id_ct_usuario_mod,
          fecha_mod: new Date(),
        },
        include: INCLUDE_ORDEN_COMPLETA,
      });
    });
  }
}

export default new OrdenService();
