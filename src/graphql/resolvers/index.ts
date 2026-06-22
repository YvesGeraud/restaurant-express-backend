import { GraphQLScalarType, Kind } from 'graphql';
import { categoriaResolvers } from './categoria.resolver';
import { platilloResolvers } from './platillo.resolver';
import { mesaResolvers } from './mesa.resolver';
import { ordenResolvers } from './orden.resolver';
import { reservacionResolvers } from './reservacion.resolver';

// ── Scalar resolvers ──────────────────────────────────────────────────────────

const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'Fecha y hora en formato ISO 8601',
  serialize: (value) => {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') return value;
    throw new Error('DateTime scalar solo acepta Date o string');
  },
  parseValue: (value) => {
    if (typeof value === 'string') return new Date(value);
    throw new Error('DateTime scalar solo acepta strings ISO 8601');
  },
  parseLiteral: (ast) => {
    if (ast.kind === Kind.STRING) return new Date(ast.value);
    throw new Error('DateTime literal debe ser un string');
  },
});

const DecimalScalar = new GraphQLScalarType({
  name: 'Decimal',
  description: 'Número decimal de precisión arbitraria',
  serialize: (value) => Number(value),
  parseValue: (value) => Number(value),
  parseLiteral: (ast) => {
    if (ast.kind === Kind.FLOAT || ast.kind === Kind.INT) return parseFloat(ast.value);
    throw new Error('Decimal literal debe ser un número');
  },
});

// ── Merge de todos los resolvers ──────────────────────────────────────────────

export const resolvers = {
  DateTime: DateTimeScalar,
  Decimal: DecimalScalar,

  Query: {
    ...categoriaResolvers.Query,
    ...platilloResolvers.Query,
    ...mesaResolvers.Query,
    ...ordenResolvers.Query,
    ...reservacionResolvers.Query,
  },

  Mutation: {
    ...platilloResolvers.Mutation,
    ...ordenResolvers.Mutation,
    ...reservacionResolvers.Mutation,
  },

  Subscription: {
    ...ordenResolvers.Subscription,
  },

  // Resolvers de campos relacionados
  Categoria: categoriaResolvers.Categoria,
  Platillo: platilloResolvers.Platillo,
  Orden: ordenResolvers.Orden,
  DetalleOrden: ordenResolvers.DetalleOrden,
  Reservacion: reservacionResolvers.Reservacion,
};
