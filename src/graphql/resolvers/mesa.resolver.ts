import type { GraphQLContext } from '@/graphql/context';
import type { ct_mesa } from '@prisma/client';

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
};
