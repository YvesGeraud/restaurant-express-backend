import type { GraphQLContext } from '@/graphql/context';
import { requireAuth } from '@/graphql/context';
import { pubsub, EVENTO_ORDEN_NUEVA, EVENTO_ORDEN_ACTUALIZADA } from '@/graphql/pubsub';
import type { rl_orden, dt_detalle_orden } from '@prisma/client';
import { GraphQLError } from 'graphql';

// ── Tipos ─────────────────────────────────────────────────────────────────────

type EstadoOrden = 'PENDIENTE' | 'EN_PROCESO' | 'LISTO' | 'ENTREGADO' | 'PAGADA' | 'CANCELADO';

interface FiltrosOrdenesInput {
  estado?: EstadoOrden;
  id_ct_usuario?: number;
  id_mesa?: number;
  pagina?: number;
  limite?: number;
}

interface ItemOrdenInput {
  id_ct_platillo: number;
  cantidad: number;
}

interface CrearOrdenInput {
  id_mesa?: number;
  detalles: ItemOrdenInput[];
}

interface ActualizarEstadoOrdenInput {
  estado: EstadoOrden;
}

// ── Include para órdenes completas (mismo que el servicio REST) ───────────────

const INCLUDE_ORDEN_COMPLETA = {
  dt_detalle_orden: {
    include: {
      ct_platillo: {
        select: { id_ct_platillo: true, nombre: true, precio: true, imagen_url: true },
      },
    },
  },
  usuario: {
    select: { id_ct_usuario: true, nombre_completo: true },
  },
  ct_mesa: {
    select: { id_ct_mesa: true, codigo: true, capacidad: true, status: true, estado: true },
  },
} as const;

type OrdenCompleta = rl_orden & {
  dt_detalle_orden: (dt_detalle_orden & {
    ct_platillo: { id_ct_platillo: number; nombre: string; precio: any; imagen_url: string | null };
  })[];
  usuario: { id_ct_usuario: number; nombre_completo: string };
  ct_mesa: { id_ct_mesa: number; codigo: string; capacidad: number; status: string; estado: boolean } | null;
};

// ── Resolvers ─────────────────────────────────────────────────────────────────

export const ordenResolvers = {
  Query: {
    ordenes: async (
      _: unknown,
      args: { filtros?: FiltrosOrdenesInput },
      ctx: GraphQLContext,
    ): Promise<OrdenCompleta[]> => {
      requireAuth(ctx);
      const f = args.filtros ?? {};

      return ctx.prisma.rl_orden.findMany({
        where: {
          ...(f.estado && { estado: f.estado }),
          ...(f.id_ct_usuario && { id_ct_usuario: f.id_ct_usuario }),
          ...(f.id_mesa && { id_ct_mesa: f.id_mesa }),
        },
        include: INCLUDE_ORDEN_COMPLETA,
        orderBy: { fecha_reg: 'desc' },
        take: Math.min(f.limite ?? 50, 100),
        skip: ((f.pagina ?? 1) - 1) * (f.limite ?? 50),
      }) as unknown as Promise<OrdenCompleta[]>;
    },

    orden: async (
      _: unknown,
      args: { id: number },
      ctx: GraphQLContext,
    ): Promise<OrdenCompleta | null> => {
      requireAuth(ctx);
      return ctx.prisma.rl_orden.findUnique({
        where: { id_rl_orden: args.id },
        include: INCLUDE_ORDEN_COMPLETA,
      }) as unknown as Promise<OrdenCompleta | null>;
    },
  },

  Mutation: {
    crearOrden: async (
      _: unknown,
      args: { input: CrearOrdenInput },
      ctx: GraphQLContext,
    ): Promise<OrdenCompleta> => {
      const usuario = requireAuth(ctx);
      const idsPlatillos = args.input.detalles.map((d) => d.id_ct_platillo);

      const nuevaOrden = await ctx.prisma.$transaction(async (tx) => {
        const platillosDb = await tx.ct_platillo.findMany({
          where: { id_ct_platillo: { in: idsPlatillos }, estado: true },
        });

        if (platillosDb.length !== idsPlatillos.length) {
          const encontrados = platillosDb.map((p) => p.id_ct_platillo);
          const faltantes = idsPlatillos.filter((id) => !encontrados.includes(id));
          throw new GraphQLError(
            `Platillos no encontrados o inactivos: [${faltantes.join(', ')}]`,
            { extensions: { code: 'BAD_USER_INPUT' } },
          );
        }

        const mapaPlatillos = new Map(platillosDb.map((p) => [p.id_ct_platillo, p.precio]));
        let totalOrden = 0;

        const detalles = args.input.detalles.map((d) => {
          const precioUnitario = Number(mapaPlatillos.get(d.id_ct_platillo));
          const subtotal = precioUnitario * d.cantidad;
          totalOrden += subtotal;
          return {
            id_ct_platillo: d.id_ct_platillo,
            cantidad: d.cantidad,
            precio_unitario: precioUnitario,
            subtotal,
            id_ct_usuario_reg: usuario.id_ct_usuario,
          };
        });

        return tx.rl_orden.create({
          data: {
            id_ct_usuario: usuario.id_ct_usuario,
            id_ct_mesa: args.input.id_mesa,
            id_ct_usuario_reg: usuario.id_ct_usuario,
            estado: 'PENDIENTE',
            total: totalOrden,
            dt_detalle_orden: { createMany: { data: detalles } },
          },
          include: INCLUDE_ORDEN_COMPLETA,
        });
      });

      // Publicar en PubSub — reemplaza socketService.notificarNuevaOrden()
      void pubsub.publish(EVENTO_ORDEN_NUEVA, { ordenNueva: nuevaOrden });

      return nuevaOrden as unknown as OrdenCompleta;
    },

    cambiarEstadoOrden: async (
      _: unknown,
      args: { id: number; input: ActualizarEstadoOrdenInput },
      ctx: GraphQLContext,
    ): Promise<OrdenCompleta> => {
      const usuario = requireAuth(ctx);

      const existente = await ctx.prisma.rl_orden.findUnique({
        where: { id_rl_orden: args.id },
      });
      if (!existente) {
        throw new GraphQLError('Orden no encontrada', { extensions: { code: 'NOT_FOUND' } });
      }

      const ordenMod = await ctx.prisma.rl_orden.update({
        where: { id_rl_orden: args.id },
        data: {
          estado: args.input.estado,
          id_ct_usuario_mod: usuario.id_ct_usuario,
          fecha_mod: new Date(),
        },
        include: INCLUDE_ORDEN_COMPLETA,
      });

      // Publicar en PubSub — reemplaza socketService.notificarCambioEstado()
      void pubsub.publish(EVENTO_ORDEN_ACTUALIZADA, { ordenActualizada: ordenMod });

      return ordenMod as unknown as OrdenCompleta;
    },

    cancelarOrden: async (
      _: unknown,
      args: { id: number },
      ctx: GraphQLContext,
    ): Promise<OrdenCompleta> => {
      const usuario = requireAuth(ctx);

      const existente = await ctx.prisma.rl_orden.findUnique({
        where: { id_rl_orden: args.id },
      });
      if (!existente) {
        throw new GraphQLError('Orden no encontrada', { extensions: { code: 'NOT_FOUND' } });
      }

      const ordenCancelada = await ctx.prisma.rl_orden.update({
        where: { id_rl_orden: args.id },
        data: {
          estado: 'CANCELADO',
          id_ct_usuario_mod: usuario.id_ct_usuario,
          fecha_mod: new Date(),
        },
        include: INCLUDE_ORDEN_COMPLETA,
      });

      void pubsub.publish(EVENTO_ORDEN_ACTUALIZADA, { ordenActualizada: ordenCancelada });

      return ordenCancelada as unknown as OrdenCompleta;
    },
  },

  Subscription: {
    ordenNueva: {
      subscribe: () => pubsub.asyncIterableIterator([EVENTO_ORDEN_NUEVA]),
    },
    ordenActualizada: {
      subscribe: () => pubsub.asyncIterableIterator([EVENTO_ORDEN_ACTUALIZADA]),
    },
  },

  // ── Resolvers de campos relacionados ───────────────────────────────────────

  Orden: {
    /** Mapea ct_mesa → Mesa (campo del schema GraphQL) */
    mesa: (parent: OrdenCompleta) => parent.ct_mesa ?? null,

    /** Los detalles vienen ya incluidos desde el include de Prisma */
    detalles: (parent: OrdenCompleta) => parent.dt_detalle_orden,
  },

  DetalleOrden: {
    /** Mapea ct_platillo → Platillo (resuelto via include, no loader) */
    platillo: (parent: OrdenCompleta['dt_detalle_orden'][number]) => parent.ct_platillo,
  },
};
