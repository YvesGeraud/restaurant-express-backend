import DataLoader from 'dataloader';
import { prisma } from '@/config/database.config';
import type { ct_categoria, ct_platillo, ct_mesa, ct_usuario } from '@prisma/client';

// ── Tipos de retorno de cada loader ──────────────────────────────────────────

export interface Loaders {
  categoria: DataLoader<number, ct_categoria | null>;
  platillo: DataLoader<number, ct_platillo | null>;
  mesa: DataLoader<number, ct_mesa | null>;
  usuario: DataLoader<number, ct_usuario | null>;
}

// ── Fábricas de DataLoader ────────────────────────────────────────────────────
// Cada loader recibe N IDs en un solo tick, hace UNA query y los mapea de vuelta.
// Esto resuelve el problema N+1 cuando los resolvers de relaciones corren en paralelo.

function crearCategoriaLoader(): DataLoader<number, ct_categoria | null> {
  return new DataLoader<number, ct_categoria | null>(async (ids) => {
    const categorias = await prisma.ct_categoria.findMany({
      where: { id_ct_categoria: { in: [...ids] } },
    });
    const mapa = new Map(categorias.map((c) => [c.id_ct_categoria, c]));
    return ids.map((id) => mapa.get(id) ?? null);
  });
}

function crearPlatilloLoader(): DataLoader<number, ct_platillo | null> {
  return new DataLoader<number, ct_platillo | null>(async (ids) => {
    const platillos = await prisma.ct_platillo.findMany({
      where: { id_ct_platillo: { in: [...ids] } },
    });
    const mapa = new Map(platillos.map((p) => [p.id_ct_platillo, p]));
    return ids.map((id) => mapa.get(id) ?? null);
  });
}

function crearMesaLoader(): DataLoader<number, ct_mesa | null> {
  return new DataLoader<number, ct_mesa | null>(async (ids) => {
    const mesas = await prisma.ct_mesa.findMany({
      where: { id_ct_mesa: { in: [...ids] } },
    });
    const mapa = new Map(mesas.map((m) => [m.id_ct_mesa, m]));
    return ids.map((id) => mapa.get(id) ?? null);
  });
}

function crearUsuarioLoader(): DataLoader<number, ct_usuario | null> {
  return new DataLoader<number, ct_usuario | null>(async (ids) => {
    const usuarios = await prisma.ct_usuario.findMany({
      where: { id_ct_usuario: { in: [...ids] } },
    });
    const mapa = new Map(usuarios.map((u) => [u.id_ct_usuario, u]));
    return ids.map((id) => mapa.get(id) ?? null);
  });
}

// ── Función principal — llamar una vez por request ────────────────────────────

/**
 * Crea un set fresco de DataLoaders por cada request.
 * NUNCA reutilizar entre requests distintos — el caché del loader
 * puede devolver datos obsoletos si se comparte entre peticiones.
 */
export function crearLoaders(): Loaders {
  return {
    categoria: crearCategoriaLoader(),
    platillo: crearPlatilloLoader(),
    mesa: crearMesaLoader(),
    usuario: crearUsuarioLoader(),
  };
}
