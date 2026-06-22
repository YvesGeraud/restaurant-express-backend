import type { GraphQLContext } from '@/graphql/context';
import type { ct_categoria } from '@prisma/client';

export const categoriaResolvers = {
  Query: {
    /**
     * Obtener todas las categorías.
     * soloActivas = true por defecto (comportamiento esperado en el menú).
     */
    categorias: async (
      _: unknown,
      args: { soloActivas?: boolean },
      ctx: GraphQLContext,
    ): Promise<ct_categoria[]> => {
      const filtrarPorEstado = args.soloActivas !== false; // default true
      return ctx.prisma.ct_categoria.findMany({
        where: filtrarPorEstado ? { estado: true } : undefined,
        orderBy: { nombre: 'asc' },
      });
    },

    categoria: async (
      _: unknown,
      args: { id: number },
      ctx: GraphQLContext,
    ): Promise<ct_categoria | null> => {
      return ctx.prisma.ct_categoria.findUnique({
        where: { id_ct_categoria: args.id },
      });
    },
  },

  Categoria: {
    /**
     * Resolver de relación: platillos de esta categoría.
     * No usa DataLoader porque la carga viene desde la propia categoría (no es N+1 aquí).
     */
    platillos: async (parent: ct_categoria, _: unknown, ctx: GraphQLContext) => {
      return ctx.prisma.ct_platillo.findMany({
        where: { id_ct_categoria: parent.id_ct_categoria, estado: true },
        orderBy: { nombre: 'asc' },
      });
    },
  },
};
