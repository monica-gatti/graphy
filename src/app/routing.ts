import { GraphData, GraphNode, Route } from './graph.model';

/** Great-circle distance in km. */
export function haversineKm(a: GraphNode, b: GraphNode): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

interface Adjacent { to: string; edgeId: string; km: number; }

function buildAdjacency(g: GraphData): Map<string, Adjacent[]> {
  const byId = new Map(g.nodes.map(n => [n.id, n]));
  const adj = new Map<string, Adjacent[]>();
  for (const e of g.edges) {
    const km = haversineKm(byId.get(e.from)!, byId.get(e.to)!);
    adj.set(e.from, [...(adj.get(e.from) ?? []), { to: e.to, edgeId: e.id, km }]);
    adj.set(e.to, [...(adj.get(e.to) ?? []), { to: e.from, edgeId: e.id, km }]);
  }
  return adj;
}

/**
 * Dijkstra from origin to destination.
 * `blocked` edges are skipped; `penalty` multiplies an edge's cost (used to diversify alternatives).
 */
export function shortestPath(
  g: GraphData,
  blocked: ReadonlySet<string> = new Set(),
  penalty: ReadonlyMap<string, number> = new Map(),
): Route | null {
  const adj = buildAdjacency(g);
  const cost = new Map<string, number>([[g.origin, 0]]);
  const prev = new Map<string, { node: string; edgeId: string; km: number }>();
  const visited = new Set<string>();

  while (true) {
    // The graph is small (~50 nodes), so a linear scan is fine instead of a priority queue
    let current: string | null = null;
    for (const [id, c] of cost) {
      if (!visited.has(id) && (current === null || c < cost.get(current)!)) current = id;
    }
    if (current === null) return null;
    if (current === g.destination) break;
    visited.add(current);

    for (const { to, edgeId, km } of adj.get(current) ?? []) {
      if (blocked.has(edgeId) || visited.has(to)) continue;
      const next = cost.get(current)! + km * (penalty.get(edgeId) ?? 1);
      if (next < (cost.get(to) ?? Infinity)) {
        cost.set(to, next);
        prev.set(to, { node: current, edgeId, km });
      }
    }
  }

  const nodeIds = [g.destination];
  const edgeIds: string[] = [];
  let km = 0;
  while (nodeIds[0] !== g.origin) {
    const step = prev.get(nodeIds[0])!;
    nodeIds.unshift(step.node);
    edgeIds.unshift(step.edgeId);
    km += step.km;
  }
  return { nodeIds, edgeIds, km };
}

/**
 * Up to `k` different routes that avoid every blocked edge.
 * After each route is found, its edges get more expensive, so the next search
 * prefers other corridors (a "penalty" method). This gives more varied routes than plain k-shortest paths.
 */
export function findAlternatives(g: GraphData, blocked: ReadonlySet<string>, k = 3): Route[] {
  const penalty = new Map<string, number>();
  const routes: Route[] = [];
  const seen = new Set<string>();

  for (let attempt = 0; attempt < k * 4 && routes.length < k; attempt++) {
    const route = shortestPath(g, blocked, penalty);
    if (!route) break;
    const key = route.edgeIds.join('|');
    if (!seen.has(key)) {
      seen.add(key);
      routes.push(route);
    }
    for (const id of route.edgeIds) penalty.set(id, (penalty.get(id) ?? 1) * 1.6);
  }
  return routes.sort((a, b) => a.km - b.km);
}
