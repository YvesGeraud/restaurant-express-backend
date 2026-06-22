import type { GraphQLContext } from '@/graphql/context';
import { requireAuth } from '@/graphql/context';
import type { ct_platillo } from '@prisma/client';
import { GraphQLError } from 'graphql';

// ── Tipos de input (espejo de los schemas .graphql) ───────────────────────────

interface FiltrosPlatillosInput {
  busqueda?: string;
  id_ct_categoria?: number;
  estado?: boolean;
  pagina?: number;
  limite?: number;
}

interface CrearPlatilloInput {
  id_ct_categoria: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  imagen_url?: string;
}

interface ActualizarPlatilloInput {
  nombre?: string;
  descripcion?: string;
  precio?: number;
  imagen_url?: string;
  id_ct_categoria?: number;
  estado?: boolean;
}

// ── Resolvers ─────────────────────────────────────────────────────────────────

export const platilloResolvers = {
  Query: {
    platillos: async (
      _: unknown,
      args: { filtros?: FiltrosPlatillosInput },
      ctx: GraphQLContext,
    ): Promise<ct_platillo[]> => {
      const f = args.filtros ?? {};
      const where: import('@prisma/client').Prisma.ct_platilloWhereInput = {};

      if (f.busqueda) {
        where.OR = [
          { nombre: { contains: f.busqueda } },
          { descripcion: { contains: f.busqueda } },
        ];
      }
      if (f.id_ct_categoria !== undefined) where.id_ct_categoria = f.id_ct_categoria;
      // Si no se filtra por estado, mostrar solo activos (comportamiento del menú)
      where.estado = f.estado !== undefined ? f.estado : true;

      const limite = Math.min(f.limite ?? 50, 100); // max 100 por query
      const pagina = f.pagina ?? 1;

      return ctx.prisma.ct_platillo.findMany({
        where,
        orderBy: { nombre: 'asc' },
        take: limite,
        skip: (pagina - 1) * limite,
      });
    },

    platillo: async (
      _: unknown,
      args: { id: number },
      ctx: GraphQLContext,
    ): Promise<ct_platillo | null> => {
      return ctx.prisma.ct_platillo.findUnique({
        where: { id_ct_platillo: args.id },
      });
    },
  },

  Mutation: {
    crearPlatillo: async (
      _: unknown,
      args: { input: CrearPlatilloInput },
      ctx: GraphQLContext,
    ): Promise<ct_platillo> => {
      const usuario = requireAuth(ctx);

      // Verificar nombre único entre activos
      const existe = await ctx.prisma.ct_platillo.findFirst({
        where: { nombre: args.input.nombre, estado: true },
      });
      if (existe) {
        throw new GraphQLError('Ya existe un platillo activo con ese nombre', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      return ctx.prisma.ct_platillo.create({
        data: {
          ...args.input,
          id_ct_usuario_reg: usuario.id_ct_usuario,
        },
      });
    },

    actualizarPlatillo: async (
      _: unknown,
      args: { id: number; input: ActualizarPlatilloInput },
      ctx: GraphQLContext,
    ): Promise<ct_platillo> => {
      const usuario = requireAuth(ctx);

      const existente = await ctx.prisma.ct_platillo.findUnique({
        where: { id_ct_platillo: args.id },
      });
      if (!existente) {
        throw new GraphQLError('Platillo no encontrado', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return ctx.prisma.ct_platillo.update({
        where: { id_ct_platillo: args.id },
        data: {
          ...args.input,
          id_ct_usuario_mod: usuario.id_ct_usuario,
          fecha_mod: new Date(),
        },
      });
    },

    eliminarPlatillo: async (
      _: unknown,
      args: { id: number },
      ctx: GraphQLContext,
    ): Promise<boolean> => {
      const usuario = requireAuth(ctx);

      const existente = await ctx.prisma.ct_platillo.findUnique({
        where: { id_ct_platillo: args.id },
      });
      if (!existente) {
        throw new GraphQLError('Platillo no encontrado', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // Soft delete — preserva historial en dt_detalle_orden
      await ctx.prisma.ct_platillo.update({
        where: { id_ct_platillo: args.id },
        data: {
          estado: false,
          id_ct_usuario_mod: usuario.id_ct_usuario,
          fecha_mod: new Date(),
        },
      });

      return true;
    },
  },

  /**
   * Resolver de relación: Platillo.categoria
   * Usa el DataLoader para evitar N+1 cuando se piden muchos platillos con su categoría.
   *
   * Sin DataLoader: 1 platillo = 1 query, 50 platillos = 50 queries
   * Con DataLoader: 50 platillos = 1 query para todas las categorías
   */
  Platillo: {
    categoria: (parent: ct_platillo, _: unknown, ctx: GraphQLContext) => {
      return ctx.loaders.categoria.load(parent.id_ct_categoria);
    },
  },
};
