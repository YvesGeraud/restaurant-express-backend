import { PubSub } from 'graphql-subscriptions';

/**
 * Singleton de PubSub compartido por todos los resolvers y servicios.
 * graphql-subscriptions es en memoria (válido para un solo proceso).
 *
 * En producción multi-instancia se reemplaza por:
 *   - graphql-redis-subscriptions (Redis Pub/Sub)
 *   - graphql-postgres-subscriptions (PostgreSQL LISTEN/NOTIFY)
 */
export const pubsub = new PubSub();

// ── Constantes de eventos ─────────────────────────────────────────────────────

/** Se publica al crear una nueva orden */
export const EVENTO_ORDEN_NUEVA = 'ORDEN_NUEVA';

/** Se publica al actualizar estado o datos de una orden existente */
export const EVENTO_ORDEN_ACTUALIZADA = 'ORDEN_ACTUALIZADA';
