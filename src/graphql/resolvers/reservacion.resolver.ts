import type { GraphQLContext } from '@/graphql/context';
import { requireAuth } from '@/graphql/context';
import reservacionService from '@/services/reservacion.service';
import type { Prisma } from '@prisma/client';
import { INCLUDE_RESERVACION_TODO } from '@/constants/prisma_include.constants';

// ── Tipos ─────────────────────────────────────────────────────────────────────

type ReservacionCompleta = Prisma.rl_reservacionGetPayload<{
  include: typeof INCLUDE_RESERVACION_TODO;
}>;

interface FiltrosReservacionesInput {
  id_ct_cliente?: number;
  id_ct_mesa?: number;
  clave_estado?: string;
  pagina?: number;
  limite?: number;
  ordenar_por?: 'id_rl_reservacion' | 'id_ct_estado_reservacion' | 'fecha_reservacion' | 'fecha_reg';
  orden?: 'asc' | 'desc';
}

interface ClienteInput {
  nombre: string;
  correo: string;
  telefono: string;
}

interface CrearReservacionInput {
  id_ct_cliente?: number;
  cliente?: ClienteInput;
  id_ct_mesa?: number;
  fecha_reservacion: string;
  num_personas: number;
  notas?: string;
}

interface ActualizarReservacionInput {
  id_ct_mesa?: number;
  fecha_reservacion?: string;
  num_personas?: number;
  notas?: string;
  estado?: string;
}

// ── Resolvers ─────────────────────────────────────────────────────────────────

export const reservacionResolvers = {
  Query: {
    reservaciones: async (
      _: unknown,
      args: { filtros?: FiltrosReservacionesInput },
      ctx: GraphQLContext,
    ): Promise<ReservacionCompleta[]> => {
      requireAuth(ctx);
      const filtros = args.filtros ?? {};
      const resultado = await reservacionService.obtenerTodos(filtros);
      return resultado.datos as unknown as ReservacionCompleta[];
    },

    reservacion: async (
      _: unknown,
      args: { id: number },
      ctx: GraphQLContext,
    ): Promise<ReservacionCompleta | null> => {
      requireAuth(ctx);
      try {
        const reservacion = await reservacionService.obtenerPorId(args.id);
        return reservacion as unknown as ReservacionCompleta;
      } catch {
        return null;
      }
    },
  },

  Mutation: {
    crearReservacion: async (
      _: unknown,
      args: { input: CrearReservacionInput },
      ctx: GraphQLContext,
    ): Promise<ReservacionCompleta> => {
      // Si el usuario está autenticado, se asocia su ID, si no es una creación pública (ID: 1)
      const id_ct_usuario_reg = ctx.usuario?.id_ct_usuario ?? 1;

      const datos = {
        ...args.input,
        fecha_reservacion: new Date(args.input.fecha_reservacion),
      };

      const nuevaReservacion = await reservacionService.crear(id_ct_usuario_reg, datos);
      return nuevaReservacion as unknown as ReservacionCompleta;
    },

    actualizarReservacion: async (
      _: unknown,
      args: { id: number; input: ActualizarReservacionInput },
      ctx: GraphQLContext,
    ): Promise<ReservacionCompleta> => {
      const usuario = requireAuth(ctx);

      const datos = {
        ...args.input,
        fecha_reservacion: args.input.fecha_reservacion
          ? new Date(args.input.fecha_reservacion)
          : undefined,
      };

      const reservacionModificada = await reservacionService.actualizar(
        args.id,
        usuario.id_ct_usuario,
        datos,
      );
      return reservacionModificada as unknown as ReservacionCompleta;
    },

    eliminarReservacion: async (
      _: unknown,
      args: { id: number },
      ctx: GraphQLContext,
    ): Promise<boolean> => {
      const usuario = requireAuth(ctx);
      await reservacionService.eliminar(args.id, usuario.id_ct_usuario);
      return true;
    },
  },

  Reservacion: {
    cliente: (parent: ReservacionCompleta) => parent.ct_cliente,
    estado: (parent: ReservacionCompleta) => parent.ct_estado_reservacion,
    mesa: (parent: ReservacionCompleta) => parent.ct_mesa ?? null,
    usuario_registro: (parent: ReservacionCompleta) => parent.usuario_registro,
    usuario_modificacion: async (parent: ReservacionCompleta, _: unknown, ctx: GraphQLContext) => {
      if (!parent.id_ct_usuario_mod) return null;
      const usr = await ctx.loaders.usuario.load(parent.id_ct_usuario_mod);
      if (!usr) return null;
      return {
        id_ct_usuario: usr.id_ct_usuario,
        nombre_completo: usr.nombre_completo,
      };
    },
  },
};
