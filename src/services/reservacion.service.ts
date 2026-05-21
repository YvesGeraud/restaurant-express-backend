import { prisma } from '@/config/database.config';
import { Prisma } from '@prisma/client';
import type { OpcionesPaginacion } from '@/utils/paginacion.utils';
import { paginar } from '@/utils/paginacion.utils';
import { buscarOError } from '@/utils/prisma.utils';
import { PAGINACION } from '@/constants';
import { ErrorNoEncontrado, ErrorNegocio } from '@/utils/errores.utils';
import type { ResultadoPaginado } from '@/types';
import {
  FiltrosReservaciones,
  CrearReservacionDTO,
  ActualizarReservacionDTO,
  CAMPOS_ORDENABLES_RESERVACION,
} from '@/schemas/reservacion.schema';
import { INCLUDE_RESERVACION_TODO } from '@/constants/prisma_include.constants';
import { ESTADO_RESERVACION } from '@/schemas/pago.schema';

type ReservacionCompleta = Prisma.rl_reservacionGetPayload<{
  include: typeof INCLUDE_RESERVACION_TODO;
}>;

class ReservacionService {
  /**
   * Obtiene todas las reservaciones con filtros y paginación.
   * El filtro de estado se hace por la clave del catálogo via relación anidada.
   */
  async obtenerTodos(
    filtros: FiltrosReservaciones,
  ): Promise<ResultadoPaginado<ReservacionCompleta>> {
    const opciones: OpcionesPaginacion = {
      pagina: Number(filtros.pagina) || PAGINACION.PAGINA_POR_DEFECTO,
      limite: Number(filtros.limite) || PAGINACION.LIMITE_POR_DEFECTO,
      ordenarPor: filtros.ordenar_por ?? CAMPOS_ORDENABLES_RESERVACION[0],
      orden: filtros.orden ?? 'desc',
    };

    const where: Prisma.rl_reservacionWhereInput = {};

    if (filtros.id_ct_cliente) where.id_ct_cliente = Number(filtros.id_ct_cliente);
    if (filtros.id_ct_mesa) where.id_ct_mesa = Number(filtros.id_ct_mesa);

    // Filtro por clave del catálogo — se hace via relación anidada con ct_estado_reservacion
    if (filtros.clave_estado) {
      where.ct_estado_reservacion = { clave: filtros.clave_estado };
    }

    return paginar(prisma.rl_reservacion, where, opciones, INCLUDE_RESERVACION_TODO) as Promise<
      ResultadoPaginado<ReservacionCompleta>
    >;
  }

  /**
   * Obtiene una reservación por ID.
   */
  async obtenerPorId(id: number): Promise<ReservacionCompleta> {
    return buscarOError(
      prisma.rl_reservacion.findUnique({
        where: { id_rl_reservacion: id },
        include: INCLUDE_RESERVACION_TODO,
      }),
      'Reservación',
    );
  }

  /**
   * Crea una nueva reservación con estado inicial PENDIENTE_PAGO.
   *
   * FLUJO: Al crear la reservación, aún no hay pago.
   * El estado PENDIENTE_PAGO indica que el sistema espera que el cliente
   * complete el proceso de pago via el endpoint POST /reservaciones/:id/pago.
   */
  async crear(id_ct_usuario_reg: number, datos: CrearReservacionDTO): Promise<ReservacionCompleta> {
    // 1. Validar solapamiento de horarios (± 2 horas)
    if (datos.id_ct_mesa && datos.fecha_reservacion) {
      const fechaNueva = new Date(datos.fecha_reservacion);
      const fechaInicio = new Date(fechaNueva.getTime() - 2 * 60 * 60 * 1000);
      const fechaFin = new Date(fechaNueva.getTime() + 2 * 60 * 60 * 1000);

      const reservacionEmpalmada = await prisma.rl_reservacion.findFirst({
        where: {
          id_ct_mesa: datos.id_ct_mesa,
          fecha_reservacion: {
            gte: fechaInicio,
            lt: fechaFin,
          },
          ct_estado_reservacion: {
            clave: {
              in: [ESTADO_RESERVACION.PENDIENTE_PAGO, ESTADO_RESERVACION.CONFIRMADA]
            }
          }
        }
      });

      if (reservacionEmpalmada) {
        throw new ErrorNegocio(
          'La mesa seleccionada ya tiene una reservación cercana a ese horario. Por favor elige otra mesa u otro horario.'
        );
      }
    }

    // 2. Validar o crear el cliente
    let id_ct_cliente = datos.id_ct_cliente;

    if (!id_ct_cliente) {
      if (!datos.cliente) {
        throw new ErrorNegocio('Debe proporcionar un cliente para la reservación.');
      }

      // Buscar cliente por correo
      let clienteExistente = await prisma.ct_cliente.findFirst({
        where: { correo: datos.cliente.correo, estado: true }
      });

      if (!clienteExistente) {
        // Crear cliente
        clienteExistente = await prisma.ct_cliente.create({
          data: {
            nombre: datos.cliente.nombre,
            correo: datos.cliente.correo,
            telefono: datos.cliente.telefono,
            id_ct_usuario_reg,
          }
        });
      }

      id_ct_cliente = clienteExistente.id_ct_cliente;
    } else {
      const cliente = await prisma.ct_cliente.findUnique({
        where: { id_ct_cliente, estado: true },
      });

      if (!cliente) {
        throw new ErrorNoEncontrado('Cliente');
      }
    }

    // Obtener el ID del estado inicial PENDIENTE_PAGO del catálogo
    const estadoPendiente = await prisma.ct_estado_reservacion.findUnique({
      where: { clave: ESTADO_RESERVACION.PENDIENTE_PAGO },
    });

    if (!estadoPendiente) {
      throw new Error(
        'Estado PENDIENTE_PAGO no encontrado en ct_estado_reservacion. Corre el seed.',
      );
    }

    // También obtener la configuración para copiar horas_gracia_cancelacion
    const config = await prisma.ct_configuracion.findFirst();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { cliente: _cliente, id_ct_cliente: _idCli, ...datosReservacion } = datos;

    return prisma.rl_reservacion.create({
      data: {
        ...datosReservacion,
        id_ct_cliente,
        id_ct_usuario_reg,
        // Estado inicial: siempre PENDIENTE_PAGO al crear una reservación
        id_ct_estado_reservacion: estadoPendiente.id_ct_estado_reservacion,
        // Copiamos la regla de cancelación vigente al momento de la reservación
        // para que cambios futuros en ct_configuracion no afecten contratos ya establecidos
        horas_gracia_cancelacion: config?.horas_gracia_cancelacion ?? 24,
      },
      include: INCLUDE_RESERVACION_TODO,
    });
  }

  /**
   * Actualiza datos logísticos de una reservación (fecha, mesa, personas, notas).
   * Las transiciones de estado se manejan via pago.service.ts, no aquí.
   */
  async actualizar(
    id_rl_reservacion: number,
    id_ct_usuario_mod: number,
    datos: ActualizarReservacionDTO,
  ): Promise<ReservacionCompleta> {
    await this.obtenerPorId(id_rl_reservacion);

    // Si se pasa un estado en el body, necesitamos buscar el ID del catálogo
    let id_ct_estado_reservacion: number | undefined;
    if (datos.estado) {
      const estadoCat = await prisma.ct_estado_reservacion.findUnique({
        where: { clave: datos.estado },
      });
      if (!estadoCat) throw new ErrorNoEncontrado(`Estado '${datos.estado}'`);
      id_ct_estado_reservacion = estadoCat.id_ct_estado_reservacion;
    }

    // Omitimos 'estado' del spread porque no es una columna directa en la tabla.
    // El campo correcto es id_ct_estado_reservacion (FK al catálogo), ya calculado arriba.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { estado: _estadoClave, ...datosSinEstado } = datos;

    return prisma.rl_reservacion.update({
      where: { id_rl_reservacion },
      data: {
        ...datosSinEstado,
        ...(id_ct_estado_reservacion !== undefined && { id_ct_estado_reservacion }),
        id_ct_usuario_mod,
        fecha_mod: new Date(),
      },
      include: INCLUDE_RESERVACION_TODO,
    });
  }

  /**
   * Cancela una reservación (soft delete / cambio de estado).
   * Para cancelaciones sin lógica de pago — usa el estado CANCELADA directamente.
   * Si se necesita evaluar la política de cancelación, usa pago.service.cancelarReservacion.
   */
  async eliminar(id: number, id_ct_usuario_mod: number): Promise<void> {
    await this.obtenerPorId(id);

    const estadoCancelada = await prisma.ct_estado_reservacion.findUnique({
      where: { clave: ESTADO_RESERVACION.CANCELADA },
    });

    await prisma.rl_reservacion.update({
      where: { id_rl_reservacion: id },
      data: {
        id_ct_estado_reservacion: estadoCancelada?.id_ct_estado_reservacion,
        id_ct_usuario_mod,
        fecha_mod: new Date(),
      },
    });
  }
}

export default new ReservacionService();
