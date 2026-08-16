"use client";

import { useMemo } from "react";

export interface LayoutNode {
  id: string;
  weight: number;
  radius?: number;
}

export interface LayoutEdge {
  source: string;
  target: string;
  weight: number;
}

export interface PositionedNode {
  id: string;
  x: number;
  y: number;
}

export type LayoutMode =
  | { type: "overview"; showIsolates: boolean; minEdgeWeight: number }
  | { type: "local"; focusId: string };

function seededUnit(seed: string, salt: number): number {
  let hash = 2166136261 ^ salt;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 100000) / 100000;
}

export function connectedComponents(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
): string[][] {
  const ids = nodes.map((node) => node.id);
  const idSet = new Set(ids);
  const adj = new Map<string, string[]>();
  for (const id of ids) adj.set(id, []);
  for (const edge of edges) {
    if (!idSet.has(edge.source) || !idSet.has(edge.target)) continue;
    adj.get(edge.source)!.push(edge.target);
    adj.get(edge.target)!.push(edge.source);
  }

  const seen = new Set<string>();
  const components: string[][] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const stack = [id];
    const group: string[] = [];
    seen.add(id);
    while (stack.length) {
      const current = stack.pop()!;
      group.push(current);
      for (const next of adj.get(current) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        stack.push(next);
      }
    }
    components.push(group);
  }
  return components.sort((a, b) => b.length - a.length);
}

/** Degree map for overview filtering (isolates = degree 0). */
export function nodeDegrees(nodes: LayoutNode[], edges: LayoutEdge[]) {
  const degree = new Map<string, number>();
  for (const node of nodes) degree.set(node.id, 0);
  const idSet = new Set(nodes.map((n) => n.id));
  for (const edge of edges) {
    if (!idSet.has(edge.source) || !idSet.has(edge.target)) continue;
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  }
  return degree;
}

/**
 * Overview backbone: maximum spanning tree + a few strongest chords.
 * Dense co-occurrence cliques otherwise collapse into a hairball.
 */
export function filterOverviewEdges(
  edges: LayoutEdge[],
  _minWeight = 1,
  nodeIds?: Iterable<string>,
): LayoutEdge[] {
  if (edges.length === 0) return edges;

  const idSet = nodeIds ? new Set(nodeIds) : null;
  const candidates = (
    idSet
      ? edges.filter((e) => idSet.has(e.source) && idSet.has(e.target))
      : edges
  )
    .slice()
    .sort((a, b) => b.weight - a.weight || a.source.localeCompare(b.source));

  if (candidates.length === 0) return [];

  const parent = new Map<string, string>();
  const find = (id: string): string => {
    const p = parent.get(id) ?? id;
    if (p !== id) {
      const root = find(p);
      parent.set(id, root);
      return root;
    }
    return id;
  };
  const unite = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return false;
    parent.set(ra, rb);
    return true;
  };

  for (const edge of candidates) {
    if (!parent.has(edge.source)) parent.set(edge.source, edge.source);
    if (!parent.has(edge.target)) parent.set(edge.target, edge.target);
  }

  const tree: LayoutEdge[] = [];
  const used = new Set<string>();
  const keyOf = (e: LayoutEdge) =>
    e.source < e.target ? `${e.source}|${e.target}` : `${e.target}|${e.source}`;

  for (const edge of candidates) {
    if (unite(edge.source, edge.target)) {
      tree.push(edge);
      used.add(keyOf(edge));
    }
  }

  // Keep overview sparse — tree plus a couple of chords at most.
  const extraBudget = Math.min(3, Math.max(1, Math.floor(tree.length * 0.2)));
  let extras = 0;
  for (const edge of candidates) {
    if (extras >= extraBudget) break;
    const key = keyOf(edge);
    if (used.has(key)) continue;
    tree.push(edge);
    used.add(key);
    extras += 1;
  }

  return tree.length > 0 ? tree : candidates.slice(0, Math.min(12, candidates.length));
}

function layoutCluster(
  nodeIds: string[],
  nodeById: Map<string, LayoutNode>,
  edges: LayoutEdge[],
  opts?: { spread?: number; labelClearance?: number },
): Map<string, PositionedNode> {
  const positions = new Map<string, PositionedNode>();
  const nodes = nodeIds.map((id) => nodeById.get(id)!).filter(Boolean);
  if (nodes.length === 0) return positions;

  if (nodes.length === 1) {
    positions.set(nodes[0]!.id, { id: nodes[0]!.id, x: 0, y: 0 });
    return positions;
  }

  if (nodes.length === 2) {
    const gap = 120;
    positions.set(nodes[0]!.id, { id: nodes[0]!.id, x: -gap / 2, y: 0 });
    positions.set(nodes[1]!.id, { id: nodes[1]!.id, x: gap / 2, y: 0 });
    return positions;
  }

  const spread = opts?.spread ?? 1;
  const labelClearance = opts?.labelClearance ?? 52;
  const idSet = new Set(nodeIds);
  const localEdges = edges.filter(
    (edge) => idSet.has(edge.source) && idSet.has(edge.target),
  );

  const k = Math.max(110, 48 + nodes.length * 14) * spread;
  const radiusOf = (id: string) => nodeById.get(id)?.radius ?? 16;

  const seedR = k * (0.55 + Math.min(nodes.length, 24) * 0.02);
  nodes.forEach((node, index) => {
    const angle = (index / nodes.length) * Math.PI * 2;
    const radius = seedR * (0.85 + seededUnit(node.id, 1) * 0.3);
    positions.set(node.id, {
      id: node.id,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  });

  const iterations = 280;
  let temperature = k * 1.35;
  const cooling = temperature / (iterations + 1);

  for (let step = 0; step < iterations; step += 1) {
    const displacement = new Map<string, { dx: number; dy: number }>();
    for (const node of nodes) displacement.set(node.id, { dx: 0, dy: 0 });

    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = positions.get(nodes[i]!.id)!;
        const b = positions.get(nodes[j]!.id)!;
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let distance = Math.hypot(dx, dy);
        if (distance < 0.01) {
          dx = seededUnit(a.id + b.id, 2) - 0.5;
          dy = seededUnit(b.id + a.id, 3) - 0.5;
          distance = 0.01;
        }
        const force = (k * k) / distance;
        const ax = displacement.get(a.id)!;
        const bx = displacement.get(b.id)!;
        ax.dx += (dx / distance) * force;
        ax.dy += (dy / distance) * force;
        bx.dx -= (dx / distance) * force;
        bx.dy -= (dy / distance) * force;
      }
    }

    for (const edge of localEdges) {
      const a = positions.get(edge.source);
      const b = positions.get(edge.target);
      if (!a || !b) continue;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const distance = Math.max(Math.hypot(dx, dy), 0.01);
      const ideal = k * 1.35;
      const force = (distance - ideal) * 0.055;
      const ax = displacement.get(a.id)!;
      const bx = displacement.get(b.id)!;
      ax.dx -= (dx / distance) * force;
      ax.dy -= (dy / distance) * force;
      bx.dx += (dx / distance) * force;
      bx.dy += (dy / distance) * force;
    }

    for (const node of nodes) {
      const position = positions.get(node.id)!;
      const move = displacement.get(node.id)!;
      move.dx += -position.x * 0.004;
      move.dy += -position.y * 0.004;
      const magnitude = Math.max(Math.hypot(move.dx, move.dy), 0.01);
      const limited = Math.min(magnitude, temperature);
      position.x += (move.dx / magnitude) * limited;
      position.y += (move.dy / magnitude) * limited;
    }

    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = positions.get(nodes[i]!.id)!;
        const b = positions.get(nodes[j]!.id)!;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distance = Math.hypot(dx, dy);
        const minDist = radiusOf(a.id) + radiusOf(b.id) + labelClearance;
        if (distance < 0.01) {
          dx = 0.5;
          dy = seededUnit(a.id, 7) - 0.5;
          distance = 0.01;
        }
        if (distance < minDist) {
          const overlap = (minDist - distance) / 2;
          const nx = dx / distance;
          const ny = dy / distance;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;
        }
      }
    }

    temperature -= cooling;
  }

  return positions;
}

function layoutStarCluster(
  nodeIds: string[],
  nodeById: Map<string, LayoutNode>,
  edges: LayoutEdge[],
  hubId: string,
): Map<string, PositionedNode> {
  const positions = new Map<string, PositionedNode>();
  const idSet = new Set(nodeIds);
  const hub = nodeById.get(hubId);
  if (!hub) return positions;

  positions.set(hubId, { id: hubId, x: 0, y: 0 });

  const weightToHub = new Map<string, number>();
  const neighbors: string[] = [];
  for (const edge of edges) {
    if (!idSet.has(edge.source) || !idSet.has(edge.target)) continue;
    let other: string | null = null;
    if (edge.source === hubId) other = edge.target;
    else if (edge.target === hubId) other = edge.source;
    if (!other || other === hubId) continue;
    if (!weightToHub.has(other)) neighbors.push(other);
    weightToHub.set(other, Math.max(weightToHub.get(other) ?? 0, edge.weight));
  }

  neighbors.sort(
    (a, b) =>
      (weightToHub.get(b) ?? 0) - (weightToHub.get(a) ?? 0) ||
      (nodeById.get(b)?.weight ?? 0) - (nodeById.get(a)?.weight ?? 0),
  );

  const hubR = hub.radius ?? 16;
  // Room for node + label pill under each spoke.
  const ring = Math.max(210, hubR + 140 + neighbors.length * 22);

  neighbors.forEach((id, index) => {
    const angle =
      -Math.PI / 2 + (index / Math.max(neighbors.length, 1)) * Math.PI * 2;
    positions.set(id, {
      id,
      x: Math.cos(angle) * ring,
      y: Math.sin(angle) * ring,
    });
  });

  // 2-hop leftovers sit on a second ring so their labels stay visible.
  const outer = nodeIds.filter((id) => !positions.has(id));
  const outerRing = ring + 110;
  outer.forEach((id, index) => {
    const angle =
      -Math.PI / 2 +
      ((index + 0.5) / Math.max(outer.length, 1)) * Math.PI * 2;
    positions.set(id, {
      id,
      x: Math.cos(angle) * outerRing,
      y: Math.sin(angle) * outerRing,
    });
  });

  const movable = nodeIds.filter((id) => id !== hubId);
  for (let pass = 0; pass < 70; pass += 1) {
    for (let i = 0; i < movable.length; i += 1) {
      for (let j = i + 1; j < movable.length; j += 1) {
        const a = positions.get(movable[i]!)!;
        const b = positions.get(movable[j]!)!;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distance = Math.hypot(dx, dy);
        const minDist =
          (nodeById.get(a.id)?.radius ?? 16) +
          (nodeById.get(b.id)?.radius ?? 16) +
          96;
        if (distance < 0.01) {
          dx = 0.5;
          dy = 0.5;
          distance = 0.01;
        }
        if (distance < minDist) {
          const push = (minDist - distance) / 2;
          const nx = dx / distance;
          const ny = dy / distance;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
        }
      }
    }
  }

  return positions;
}

function pickHubId(nodeIds: string[], edges: LayoutEdge[]): string | null {
  const degree = new Map<string, number>();
  for (const id of nodeIds) degree.set(id, 0);
  const idSet = new Set(nodeIds);
  for (const edge of edges) {
    if (!idSet.has(edge.source) || !idSet.has(edge.target)) continue;
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestDeg = 0;
  for (const [id, deg] of degree) {
    if (deg > bestDeg) {
      best = id;
      bestDeg = deg;
    }
  }
  if (!best || bestDeg < 3) return null;
  if (bestDeg < Math.ceil(nodeIds.length * 0.4)) return null;
  return best;
}

function clusterBounds(local: Map<string, PositionedNode>) {
  const points = [...local.values()];
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    minX,
    maxX,
    minY,
    maxY,
    spanX: Math.max(maxX - minX, 80),
    spanY: Math.max(maxY - minY, 80),
    midX: (minX + maxX) / 2,
    midY: (minY + maxY) / 2,
  };
}

function layoutOverview(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  width: number,
  height: number,
  showIsolates: boolean,
): Map<string, PositionedNode> {
  const result = new Map<string, PositionedNode>();
  if (nodes.length === 0) return result;

  const degrees = nodeDegrees(nodes, edges);
  const activeNodes = showIsolates
    ? nodes
    : nodes.filter((node) => (degrees.get(node.id) ?? 0) > 0);
  const working = activeNodes.length > 0 ? activeNodes : nodes;

  const nodeById = new Map(working.map((node) => [node.id, node]));
  const components = connectedComponents(working, edges);

  // Asymmetric chrome: mode chip left, filter/search right.
  const leftPad = 200;
  const rightPad = 340;
  const topPad = 120;
  const bottomPad = 140;
  const usableW = Math.max(width - leftPad - rightPad, 260);
  const usableH = Math.max(height - topPad - bottomPad, 260);
  const cx = leftPad + usableW / 2;
  const cy = topPad + usableH / 2;

  const packed = components.map((ids, index) => {
    const hubId = pickHubId(ids, edges);
    const local = hubId
      ? layoutStarCluster(ids, nodeById, edges, hubId)
      : layoutCluster(ids, nodeById, edges, {
          spread: 1.35,
          labelClearance: 82,
        });
    const bounds = clusterBounds(local);
    const budget = Math.min(
      Math.min(usableW, usableH) * (components.length === 1 ? 0.78 : 0.52),
      Math.max(200, 105 * Math.sqrt(ids.length)),
    );
    const scale = budget / Math.max(bounds.spanX, bounds.spanY, 1);
    const radius = (Math.hypot(bounds.spanX, bounds.spanY) / 2) * scale + 52;
    return { ids, local, bounds, scale, radius, index };
  });

  const centres = new Map<number, { x: number; y: number }>();
  if (packed.length === 1) {
    centres.set(0, { x: cx, y: cy });
  } else if (packed.length === 2) {
    const gap = packed[0]!.radius + packed[1]!.radius + 110;
    const half = Math.min(gap / 2, usableW * 0.38);
    centres.set(packed[0]!.index, { x: cx - half, y: cy });
    centres.set(packed[1]!.index, { x: cx + half, y: cy });
  } else {
    // Largest cluster left-center; smaller ones fan right — not piled under it.
    const [main, ...rest] = packed;
    centres.set(main!.index, { x: cx - usableW * 0.16, y: cy });
    rest.forEach((cluster, i) => {
      const t = rest.length === 1 ? 0.5 : i / (rest.length - 1);
      centres.set(cluster.index, {
        x: cx + usableW * 0.2,
        y: cy + (t - 0.5) * Math.min(usableH * 0.72, 300),
      });
    });

    for (let pass = 0; pass < 36; pass += 1) {
      for (let i = 0; i < packed.length; i += 1) {
        for (let j = i + 1; j < packed.length; j += 1) {
          const a = packed[i]!;
          const b = packed[j]!;
          const ca = centres.get(a.index)!;
          const cb = centres.get(b.index)!;
          let dx = cb.x - ca.x;
          let dy = cb.y - ca.y;
          let dist = Math.hypot(dx, dy);
          const min = a.radius + b.radius + 64;
          if (dist < 0.01) {
            dx = 1;
            dy = 0;
            dist = 0.01;
          }
          if (dist < min) {
            const push = (min - dist) / 2;
            const nx = dx / dist;
            const ny = dy / dist;
            ca.x -= nx * push;
            ca.y -= ny * push;
            cb.x += nx * push;
            cb.y += ny * push;
          }
        }
      }
    }
  }

  for (const cluster of packed) {
    const centre = centres.get(cluster.index)!;
    const { bounds, scale, local } = cluster;
    for (const [id, point] of local) {
      result.set(id, {
        id,
        x: centre.x + (point.x - bounds.midX) * scale,
        y: centre.y + (point.y - bounds.midY) * scale,
      });
    }
  }

  // Re-center composition in the usable canvas (fixes left / right drift).
  if (result.size > 0) {
    const pts = [...result.values()];
    const minX = Math.min(...pts.map((p) => p.x));
    const maxX = Math.max(...pts.map((p) => p.x));
    const minY = Math.min(...pts.map((p) => p.y));
    const maxY = Math.max(...pts.map((p) => p.y));
    const shiftX = cx - (minX + maxX) / 2;
    const shiftY = cy - (minY + maxY) / 2;
    for (const point of pts) {
      point.x += shiftX;
      point.y += shiftY;
    }
  }

  return result;
}

function layoutLocal(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  width: number,
  height: number,
  focusId: string,
): Map<string, PositionedNode> {
  const result = new Map<string, PositionedNode>();
  if (nodes.length === 0) return result;

  // Same chrome-aware center as overview so focus doesn't jump under filters.
  const leftPad = 200;
  const rightPad = 340;
  const topPad = 120;
  const bottomPad = 140;
  const usableW = Math.max(width - leftPad - rightPad, 260);
  const usableH = Math.max(height - topPad - bottomPad, 260);
  const cx = leftPad + usableW / 2;
  const cy = topPad + usableH / 2;

  const focus = nodes.find((node) => node.id === focusId);
  if (!focus) return layoutOverview(nodes, edges, width, height, true);

  result.set(focusId, { id: focusId, x: cx, y: cy });

  const neighborIds = new Set<string>();
  const weightToFocus = new Map<string, number>();
  for (const edge of edges) {
    if (edge.source === focusId) {
      neighborIds.add(edge.target);
      weightToFocus.set(
        edge.target,
        Math.max(weightToFocus.get(edge.target) ?? 0, edge.weight),
      );
    } else if (edge.target === focusId) {
      neighborIds.add(edge.source);
      weightToFocus.set(
        edge.source,
        Math.max(weightToFocus.get(edge.source) ?? 0, edge.weight),
      );
    }
  }

  const neighbors = nodes
    .filter((node) => neighborIds.has(node.id))
    .sort(
      (a, b) =>
        (weightToFocus.get(b.id) ?? 0) - (weightToFocus.get(a.id) ?? 0) ||
        b.weight - a.weight,
    );

  const focusRadius = focus.radius ?? 22;
  const ring =
    neighbors.length <= 1
      ? Math.min(usableW, usableH) * 0.26
      : Math.min(
          Math.min(usableW, usableH) * 0.4,
          Math.max(170, focusRadius + 120 + neighbors.length * 14),
        );

  neighbors.forEach((node, index) => {
    const angle =
      -Math.PI / 2 +
      (index / Math.max(neighbors.length, 1)) * Math.PI * 2 +
      seededUnit(node.id, 4) * 0.06;
    const r = ring * (0.94 + seededUnit(node.id, 5) * 0.1);
    result.set(node.id, {
      id: node.id,
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    });
  });

  for (let pass = 0; pass < 40; pass += 1) {
    for (let i = 0; i < neighbors.length; i += 1) {
      for (let j = i + 1; j < neighbors.length; j += 1) {
        const a = result.get(neighbors[i]!.id)!;
        const b = result.get(neighbors[j]!.id)!;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distance = Math.hypot(dx, dy);
        const minDist =
          (neighbors[i]!.radius ?? 16) + (neighbors[j]!.radius ?? 16) + 88;
        if (distance < 0.01) {
          dx = 0.5;
          dy = 0.5;
          distance = 0.01;
        }
        if (distance < minDist) {
          const push = (minDist - distance) / 2;
          const nx = dx / distance;
          const ny = dy / distance;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
        }
      }
    }
  }

  return result;
}

/**
 * Dual-mode layout: packed constellations for overview, radial star for
 * Obsidian-style local focus. Pinned positions win over computed ones.
 */
export function useForceLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  width: number,
  height: number,
  mode: LayoutMode,
  pins?: ReadonlyMap<string, { x: number; y: number }>,
): Map<string, PositionedNode> {
  return useMemo(() => {
    const empty = new Map<string, PositionedNode>();
    if (nodes.length === 0 || width === 0 || height === 0) return empty;

    const computed =
      mode.type === "local"
        ? layoutLocal(nodes, edges, width, height, mode.focusId)
        : layoutOverview(nodes, edges, width, height, mode.showIsolates);

    if (!pins || pins.size === 0) return computed;

    const merged = new Map(computed);
    for (const [id, pin] of pins) {
      if (merged.has(id)) {
        merged.set(id, { id, x: pin.x, y: pin.y });
      }
    }
    return merged;
  }, [nodes, edges, width, height, mode, pins]);
}
