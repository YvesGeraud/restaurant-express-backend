import { ApolloServer } from '@apollo/server';
import { loadFiles } from '@graphql-tools/load-files';
import { mergeTypeDefs } from '@graphql-tools/merge';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { join } from 'path';
import { resolvers } from '@/graphql/resolvers';
import type { GraphQLContext } from '@/graphql/context';

let _schema: ReturnType<typeof makeExecutableSchema> | null = null;

/**
 * Carga y compila todos los archivos .graphql del directorio schema/.
 * El resultado se cachea para no releer archivos en cada request.
 */
export async function cargarSchema() {
  if (_schema) return _schema;

  const typeDefs = mergeTypeDefs(
    await loadFiles(join(__dirname, 'schema/**/*.graphql')),
  );

  _schema = makeExecutableSchema({ typeDefs, resolvers });
  return _schema;
}

/**
 * Crea y configura la instancia de Apollo Server 4.
 * Se llama una vez al iniciar el servidor.
 */
export async function crearApolloServer(): Promise<ApolloServer<GraphQLContext>> {
  const schema = await cargarSchema();

  const server = new ApolloServer<GraphQLContext>({
    schema,
    // Apollo Sandbox habilitado en desarrollo (equivalente a GraphiQL)
    // En producción se deshabilita automáticamente
    introspection: process.env['NODE_ENV'] !== 'production',
    formatError: (formattedError, _error) => {
      // En producción, ocultar detalles internos de errores no esperados
      if (process.env['NODE_ENV'] === 'production') {
        const code = formattedError.extensions?.['code'];
        const codigosPublicos = ['BAD_USER_INPUT', 'UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND'];
        if (!codigosPublicos.includes(code as string)) {
          return {
            message: 'Error interno del servidor',
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
          };
        }
      }
      return formattedError;
    },
  });

  return server;
}
