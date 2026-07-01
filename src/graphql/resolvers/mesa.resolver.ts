import type { GraphQLContext } from '@/graphql/context';
import { requireAuth } from '@/graphql/context';
import type { ct_mesa } from '@prisma/client';
import mesaService from '@/services/mesa.service';

type StatusMesa = 'libre' | 'ocupada' | 'reservada';

interface CrearMesaInput {
  codigo: string;
  capacidad: number;
  status?: StatusMesa;
}

interface ActualizarMesaInput {
  codigo?: string;
  capacidad?: number;
  status?: StatusMesa;
  estado?: boolean;
}

export const mesaResolvers = {
  Query: {
    mesas: async (
      _: unknown,
      args: { soloActivas?: boolean },
      ctx: GraphQLContext,
    ): Promise<ct_mesa[]> => {
      const filtrarPorEstado = args.soloActivas !== false; // default true
      return ctx.prisma.ct_mesa.findMany({
        where: filtrarPorEstado ? { estado: true } : undefined,
        orderBy: { codigo: 'asc' },
      });
    },

    mesa: async (
      _: unknown,
      args: { id: number },
      ctx: GraphQLContext,
    ): Promise<ct_mesa | null> => {
      return ctx.prisma.ct_mesa.findUnique({
        where: { id_ct_mesa: args.id },
      });
    },
  },

  Mutation: {
    crearMesa: async (
      _: unknown,
      args: { input: CrearMesaInput },
      ctx: GraphQLContext,
    ): Promise<ct_mesa> => {
      const usuario = requireAuth(ctx);
      return mesaService.crear(usuario.id_ct_usuario, args.input) as Promise<ct_mesa>;
    },

    actualizarMesa: async (
      _: unknown,
      args: { id: number; input: ActualizarMesaInput },
      ctx: GraphQLContext,
    ): Promise<ct_mesa> => {
      const usuario = requireAuth(ctx);
      return mesaService.actualizar(usuario.id_ct_usuario, args.id, args.input) as Promise<ct_mesa>;
    },

    eliminarMesa: async (
      _: unknown,
      args: { id: number },
      ctx: GraphQLContext,
    ): Promise<boolean> => {
      const usuario = requireAuth(ctx);
      await mesaService.eliminar(usuario.id_ct_usuario, args.id);
      return true;
    },
  },
};
