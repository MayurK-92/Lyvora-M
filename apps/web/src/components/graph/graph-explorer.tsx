"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { MaterialIcon, cn } from "@lyvora/ui";
import { getCategoryStyle } from "@/lib/categories";
import { EmptyState } from "@/components/ui/empty-state";
import { getEntityKindStyle } from "./entity-kind";
import { GraphDetailPanel, type EntityDetail } from "./graph-detail-panel";
import {
  connectedComponents,
  filterOverviewEdges,
  nodeDegrees,
  useForceLayout,
  type LayoutMode,
} from "./use-force-layout";

export interface GraphNodeData {
  id: string;
  name: string;
  kind: string;
  mentionCount: number;
  category: string;
}

export interface GraphEdgeData {
  source: string;
  target: string;
  weight: number;
}

const MIN_RADIUS = 14;
const MAX_RADIUS = 24;

function radiusFor(mentionCount: number, max: number) {
  if (max <= 1) return MIN_RADIUS + 6;
  const ratio = Math.log(mentionCount + 1) / Math.log(max + 1);
  return MIN_RADIUS + ratio * (MAX_RADIUS - MIN_RADIUS);
}

/** Word-aware truncation / 2-line wrap so long entity names stay readable. */
function formatNodeLabel(
  name: string,
  maxPerLine: number,
): { lines: string[]; width: number } {
  const clean = name.trim();
  if (clean.length <= maxPerLine) {
    return {
      lines: [clean],
      width: Math.max(52, clean.length * 6.3 + 22),
    };
  }

  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    let best = 1;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let split = 1; split < words.length; split += 1) {
      const a = words.slice(0, split).join(" ");
      const b = words.slice(split).join(" ");
      if (a.length > maxPerLine + 2 || b.length > maxPerLine + 2) continue;
      const score = Math.abs(a.length - b.length) + a.length + b.length;
      if (score < bestScore) {
        bestScore = score;
        best = split;
      }
    }
    const line1 = words.slice(0, best).join(" ");
    let line2 = words.slice(best).join(" ");
    if (line2.length > maxPerLine) {
      line2 = `${line2.slice(0, Math.max(4, maxPerLine - 1))}…`;
    }
    const lines = [line1, line2];
    const longest = Math.max(...lines.map((line) => line.length));
    return {
      lines,
      width: Math.max(56, longest * 6.3 + 22),
    };
  }

  const truncated = `${clean.slice(0, Math.max(4, maxPerLine - 1))}…`;
  return {
    lines: [truncated],
    width: Math.max(52, truncated.length * 6.3 + 22),
  };
}

function edgePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  curved: boolean,
): string {
  if (!curved) return `M ${x1} ${y1} L ${x2} ${y2}`;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.hypot(dx, dy) || 1;
  const curve = Math.min(22, distance * 0.1);
  const cx = mx - (dy / distance) * curve;
  const cy = my + (dx / distance) * curve;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

function overviewMinWeight(edges: GraphEdgeData[]) {
  if (edges.length === 0) return 1;
  const weights = [...edges].map((e) => e.weight).sort((a, b) => b - a);
  // Soft floor for stats only — edge set uses MST backbone.
  const cutoff = weights[Math.min(weights.length - 1, Math.floor(weights.length * 0.4))] ?? 1;
  return Math.max(1, cutoff);
}

export function GraphExplorer({
  nodes,
  edges,
}: {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [detail, setDetail] = useState<EntityDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showIsolates, setShowIsolates] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [overviewPins, setOverviewPins] = useState<
    Map<string, { x: number; y: number }>
  >(() => new Map());
  const [focusPins, setFocusPins] = useState<Map<string, { x: number; y: number }>>(
    () => new Map(),
  );
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    nodeId: string;
  } | null>(null);

  const panDragRef = useRef<{
    x: number;
    y: number;
    panX: number;
    panY: number;
    moved: boolean;
  } | null>(null);
  const nodeDragRef = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  /** Survives pointerup so click can tell drag apart from a real click. */
  const suppressNodeClickRef = useRef(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const node of nodes) {
      counts.set(node.category, (counts.get(node.category) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category);
  }, [nodes]);

  const categoryFiltered = useMemo(
    () => (activeCategory ? nodes.filter((n) => n.category === activeCategory) : nodes),
    [nodes, activeCategory],
  );

  const categoryIds = useMemo(
    () => new Set(categoryFiltered.map((node) => node.id)),
    [categoryFiltered],
  );

  const categoryEdges = useMemo(
    () => edges.filter((e) => categoryIds.has(e.source) && categoryIds.has(e.target)),
    [edges, categoryIds],
  );

  const minEdgeWeight = useMemo(
    () => (focusId ? 1 : overviewMinWeight(categoryEdges)),
    [focusId, categoryEdges],
  );

  const displayEdges = useMemo(() => {
    if (focusId) {
      return categoryEdges.filter(
        (edge) => edge.source === focusId || edge.target === focusId,
      );
    }
    return filterOverviewEdges(
      categoryEdges,
      minEdgeWeight,
      categoryFiltered.map((node) => node.id),
    );
  }, [categoryEdges, focusId, minEdgeWeight, categoryFiltered]);

  const displayNodes = useMemo(() => {
    if (focusId) {
      const neighborIds = new Set<string>([focusId]);
      for (const edge of categoryEdges) {
        if (edge.source === focusId) neighborIds.add(edge.target);
        if (edge.target === focusId) neighborIds.add(edge.source);
      }
      return categoryFiltered.filter((node) => neighborIds.has(node.id));
    }

    if (showIsolates) return categoryFiltered;

    const degrees = nodeDegrees(
      categoryFiltered.map((n) => ({ id: n.id, weight: n.mentionCount })),
      displayEdges,
    );
    const connected = categoryFiltered.filter((n) => (degrees.get(n.id) ?? 0) > 0);
    return connected.length > 0 ? connected : categoryFiltered;
  }, [focusId, categoryFiltered, categoryEdges, showIsolates, displayEdges]);

  // Edges must reference visible nodes only — keeps stats honest.
  const visibleEdges = useMemo(() => {
    const ids = new Set(displayNodes.map((node) => node.id));
    return displayEdges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));
  }, [displayEdges, displayNodes]);

  const maxMentions = useMemo(
    () => displayNodes.reduce((max, node) => Math.max(max, node.mentionCount), 1),
    [displayNodes],
  );

  const layoutNodes = useMemo(
    () =>
      displayNodes.map((node) => ({
        id: node.id,
        weight: node.mentionCount,
        radius: radiusFor(node.mentionCount, maxMentions),
      })),
    [displayNodes, maxMentions],
  );

  const layoutMode: LayoutMode = useMemo(
    () =>
      focusId
        ? { type: "local", focusId }
        : { type: "overview", showIsolates, minEdgeWeight },
    [focusId, showIsolates, minEdgeWeight],
  );

  const pins = focusId ? focusPins : overviewPins;
  const setPins = focusId ? setFocusPins : setOverviewPins;

  const positions = useForceLayout(
    layoutNodes,
    visibleEdges,
    size.width,
    size.height,
    layoutMode,
    pins,
  );

  const clusterCount = useMemo(
    () => connectedComponents(layoutNodes, visibleEdges).length,
    [layoutNodes, visibleEdges],
  );

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return null;
    return new Set(
      displayNodes
        .filter((node) => node.name.toLowerCase().includes(term))
        .map((n) => n.id),
    );
  }, [query, displayNodes]);

  const hoverNeighbors = useMemo(() => {
    if (!hoveredId) return null;
    const set = new Set<string>([hoveredId]);
    for (const edge of visibleEdges) {
      if (edge.source === hoveredId) set.add(edge.target);
      if (edge.target === hoveredId) set.add(edge.source);
    }
    return set;
  }, [hoveredId, visibleEdges]);

  const connectedForPanel = useMemo(() => {
    if (!focusId) return [];
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const rows: Array<{ id: string; name: string; kind: string; weight: number }> = [];
    for (const edge of edges) {
      let other: string | null = null;
      if (edge.source === focusId) other = edge.target;
      else if (edge.target === focusId) other = edge.source;
      if (!other) continue;
      const node = byId.get(other);
      if (!node) continue;
      const existing = rows.find((row) => row.id === other);
      if (existing) {
        existing.weight = Math.max(existing.weight, edge.weight);
      } else {
        rows.push({
          id: node.id,
          name: node.name,
          kind: node.kind,
          weight: edge.weight,
        });
      }
    }
    return rows.sort((a, b) => b.weight - a.weight);
  }, [focusId, nodes, edges]);

  const focusNode = focusId ? nodes.find((n) => n.id === focusId) : null;

  const selectEntity = useCallback(async (id: string) => {
    setFocusId(id);
    setFocusPins(new Map());
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setDetail(null);
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/graph/entity/${id}`);
      if (!response.ok) throw new Error("Failed to load entity");
      const data = (await response.json()) as { entity: EntityDetail };
      setDetail(data.entity);
    } catch {
      setDetail(null);
      setFocusId(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const exitFocus = useCallback(() => {
    setFocusId(null);
    setDetail(null);
    setDetailLoading(false);
    setFocusPins(new Map());
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape" && focusId) {
        event.preventDefault();
        exitFocus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusId, exitFocus]);

  function fitToScreen() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function resetView() {
    setOverviewPins(new Map());
    setFocusPins(new Map());
    setActiveCategory(null);
    setShowIsolates(false);
    setQuery("");
    exitFocus();
  }

  function screenToWorld(clientX: number, clientY: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    const term = query.trim().toLowerCase();
    if (!term) return;
    const hit =
      displayNodes.find((node) => node.name.toLowerCase().includes(term)) ??
      nodes.find((node) => node.name.toLowerCase().includes(term));
    if (hit) void selectEntity(hit.id);
  }

  if (nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-lg">
        <EmptyState
          icon="hub"
          title="Your graph is empty"
          message="Entities appear here once Lyvora has understood a few of your saves."
          actionLabel="Go to Home"
          actionHref="/home"
        />
      </div>
    );
  }

  const selectedAccent = detail
    ? getCategoryStyle(nodes.find((node) => node.id === detail.id)?.category).accent
    : "#75777e";

  const isFocus = Boolean(focusId);

  return (
    <div className="relative h-full w-full overflow-hidden bg-surface">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_25%_15%,color-mix(in_oklab,var(--color-primary-fixed)_50%,transparent),transparent_55%),radial-gradient(ellipse_at_85%_80%,color-mix(in_oklab,var(--color-tertiary-fixed)_35%,transparent),transparent_50%),radial-gradient(ellipse_at_50%_50%,var(--color-surface-container-low),var(--color-surface))]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.28]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--color-outline-variant) 50%, transparent) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      <div
        ref={containerRef}
        onPointerDown={(event) => {
          if (nodeDragRef.current) return;
          panDragRef.current = {
            x: event.clientX,
            y: event.clientY,
            panX: pan.x,
            panY: pan.y,
            moved: false,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const nodeDrag = nodeDragRef.current;
          if (nodeDrag) {
            const dx = event.clientX - nodeDrag.startX;
            const dy = event.clientY - nodeDrag.startY;
            // Require real movement before treating as a drag (not a click).
            if (!nodeDrag.moved && Math.hypot(dx, dy) < 6) return;
            nodeDrag.moved = true;
            suppressNodeClickRef.current = true;
            setTooltip(null);
            const world = screenToWorld(event.clientX, event.clientY);
            setPins((prev) => {
              const next = new Map(prev);
              next.set(nodeDrag.id, {
                x: world.x - nodeDrag.offsetX,
                y: world.y - nodeDrag.offsetY,
              });
              return next;
            });
            return;
          }

          const drag = panDragRef.current;
          if (!drag) return;
          const dx = event.clientX - drag.x;
          const dy = event.clientY - drag.y;
          if (Math.hypot(dx, dy) > 3) drag.moved = true;
          setPan({
            x: drag.panX + dx,
            y: drag.panY + dy,
          });
        }}
        onPointerUp={() => {
          if (nodeDragRef.current?.moved) {
            suppressNodeClickRef.current = true;
          }
          panDragRef.current = null;
          nodeDragRef.current = null;
        }}
        onPointerCancel={() => {
          if (nodeDragRef.current?.moved) {
            suppressNodeClickRef.current = true;
          }
          panDragRef.current = null;
          nodeDragRef.current = null;
        }}
        onWheel={(event) => {
          setZoom((current) =>
            Math.min(2.6, Math.max(0.4, current - event.deltaY * 0.0015)),
          );
        }}
        className="absolute inset-0 z-0 cursor-grab touch-none active:cursor-grabbing"
      >
        <svg
          role="img"
          aria-label={
            isFocus
              ? `Local graph focused on ${focusNode?.name ?? "entity"}`
              : `Knowledge graph overview with ${displayNodes.length} entities`
          }
          className="size-full"
        >
          <defs>
            <filter id="node-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.16" />
            </filter>
            <filter id="node-focus" x="-60%" y="-60%" width="220%" height="220%">
              <feDropShadow dx="0" dy="4" stdDeviation="7" floodOpacity="0.28" />
            </filter>
          </defs>

          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
            <g fill="none">
              {visibleEdges.map((edge) => {
                const a = positions.get(edge.source);
                const b = positions.get(edge.target);
                if (!a || !b) return null;
                const edgeKey = `${edge.source}-${edge.target}`;
                const hoverLinked =
                  !hoverNeighbors ||
                  (hoverNeighbors.has(edge.source) && hoverNeighbors.has(edge.target));
                const searchHit =
                  !matches || matches.has(edge.source) || matches.has(edge.target);
                const toFocus =
                  isFocus &&
                  (edge.source === focusId || edge.target === focusId);
                const dimmed =
                  (Boolean(hoverNeighbors) && !hoverLinked) ||
                  (Boolean(matches) && !searchHit);
                const active =
                  hoveredEdge === edgeKey ||
                  (hoveredId != null &&
                    (edge.source === hoveredId || edge.target === hoveredId));
                const path = edgePath(a.x, a.y, b.x, b.y, isFocus);
                return (
                  <g key={edgeKey}>
                    <path
                      d={path}
                      stroke="transparent"
                      strokeWidth={14}
                      className="cursor-pointer"
                      onPointerEnter={() => setHoveredEdge(edgeKey)}
                      onPointerLeave={() =>
                        setHoveredEdge((current) => (current === edgeKey ? null : current))
                      }
                    />
                    <path
                      d={path}
                      stroke={toFocus || active ? "var(--color-primary)" : "var(--color-outline)"}
                      strokeWidth={
                        toFocus || active
                          ? Math.min(2.5 + edge.weight * 0.7, 5)
                          : Math.min(1.2 + edge.weight * 0.45, 3.2)
                      }
                      strokeOpacity={dimmed ? 0.08 : toFocus || active ? 0.75 : 0.4}
                      strokeLinecap="round"
                      className="pointer-events-none"
                    />
                    {(active || hoveredEdge === edgeKey) && (
                      <text
                        x={(a.x + b.x) / 2}
                        y={(a.y + b.y) / 2 - 8}
                        textAnchor="middle"
                        className="pointer-events-none fill-on-surface text-[10px] font-semibold"
                      >
                        {edge.weight} shared
                      </text>
                    )}
                  </g>
                );
              })}
            </g>

            <g>
              {displayNodes.map((node) => {
                const position = positions.get(node.id);
                if (!position) return null;
                const style = getCategoryStyle(node.category);
                const kind = getEntityKindStyle(node.kind);
                const radius = radiusFor(node.mentionCount, maxMentions);
                const selected = focusId === node.id;
                const hovered = hoveredId === node.id;
                const inHover = hoverNeighbors ? hoverNeighbors.has(node.id) : true;
                const searchMiss = matches ? !matches.has(node.id) : false;
                const dimmed =
                  searchMiss || (hoverNeighbors != null && !inHover && !isFocus);
                const iconSize = Math.max(12, Math.round(radius * 0.7));
                const isPinned = pins.has(node.id);

                return (
                  <g
                    key={node.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${node.name}, ${kind.label}, ${node.mentionCount} mentions${isPinned ? ", pinned" : ""}`}
                    transform={`translate(${position.x} ${position.y})`}
                    opacity={dimmed ? 0.16 : 1}
                    onPointerEnter={(event) => {
                      if (nodeDragRef.current?.moved) return;
                      setHoveredId(node.id);
                      setTooltip({
                        x: event.clientX,
                        y: event.clientY,
                        nodeId: node.id,
                      });
                    }}
                    onPointerMove={(event) => {
                      if (nodeDragRef.current?.moved) {
                        setTooltip(null);
                        return;
                      }
                      setTooltip({
                        x: event.clientX,
                        y: event.clientY,
                        nodeId: node.id,
                      });
                    }}
                    onPointerLeave={() => {
                      setHoveredId((id) => (id === node.id ? null : id));
                      setTooltip((current) =>
                        current?.nodeId === node.id ? null : current,
                      );
                    }}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      suppressNodeClickRef.current = false;
                      const world = screenToWorld(event.clientX, event.clientY);
                      nodeDragRef.current = {
                        id: node.id,
                        offsetX: world.x - position.x,
                        offsetY: world.y - position.y,
                        startX: event.clientX,
                        startY: event.clientY,
                        moved: false,
                      };
                      (event.currentTarget as SVGGElement).setPointerCapture?.(
                        event.pointerId,
                      );
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (suppressNodeClickRef.current) {
                        suppressNodeClickRef.current = false;
                        return;
                      }
                      if (panDragRef.current?.moved) return;
                      void selectEntity(node.id);
                    }}
                    onDoubleClick={(event) => {
                      event.stopPropagation();
                      event.preventDefault();
                      suppressNodeClickRef.current = true;
                      router.push(`/graph/${node.id}`);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void selectEntity(node.id);
                      }
                    }}
                    className="origin-center cursor-grab outline-none active:cursor-grabbing"
                    style={{ transition: "opacity 160ms ease" }}
                  >
                    {selected && (
                      <circle
                        r={radius + 10}
                        fill={style.accent}
                        fillOpacity={0.14}
                        className="animate-pulse"
                      />
                    )}
                    {(selected || hovered) && (
                      <circle r={radius + 6} fill={style.accent} fillOpacity={0.1} />
                    )}
                    <circle
                      r={radius}
                      fill="var(--color-surface-container-lowest)"
                      stroke={style.accent}
                      strokeWidth={selected ? 3.25 : isPinned ? 2.75 : 2.25}
                      filter={selected ? "url(#node-focus)" : "url(#node-glow)"}
                    />
                    <foreignObject
                      x={-iconSize / 2}
                      y={-iconSize / 2}
                      width={iconSize}
                      height={iconSize}
                      className="pointer-events-none overflow-visible"
                    >
                      <div
                        className="flex size-full items-center justify-center"
                        style={{ color: style.accent }}
                      >
                        <MaterialIcon name={kind.icon} size={iconSize} filled={selected} />
                      </div>
                    </foreignObject>
                    {isPinned && (
                      <g transform={`translate(${radius * 0.55} ${-radius * 0.7})`}>
                        <circle
                          r={9}
                          fill="var(--color-surface-container-lowest)"
                          stroke={style.accent}
                          strokeWidth={1.5}
                          filter="url(#node-glow)"
                        />
                        <foreignObject x={-7} y={-7} width={14} height={14} className="pointer-events-none">
                          <div
                            className="flex size-full items-center justify-center"
                            style={{ color: style.accent }}
                          >
                            <MaterialIcon name="lock" size={11} filled />
                          </div>
                        </foreignObject>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>

            {/* Labels drawn last so every name stays readable above nodes/edges */}
            <g pointerEvents="none">
              {displayNodes.map((node) => {
                const position = positions.get(node.id);
                if (!position) return null;
                const radius = radiusFor(node.mentionCount, maxMentions);
                const selected = focusId === node.id;
                const hovered = hoveredId === node.id;
                const inHover = hoverNeighbors ? hoverNeighbors.has(node.id) : true;
                const searchMiss = matches ? !matches.has(node.id) : false;
                const dimmed =
                  searchMiss || (hoverNeighbors != null && !inHover && !isFocus);
                const formatted = formatNodeLabel(
                  node.name,
                  hovered || selected || isFocus ? 18 : 14,
                );
                const lineCount = formatted.lines.length;
                const labelHeight = lineCount === 1 ? 22 : 34;
                const labelY = radius + 12 + labelHeight / 2;

                return (
                  <g
                    key={`label-${node.id}`}
                    transform={`translate(${position.x} ${position.y + labelY})`}
                    opacity={dimmed ? 0.2 : 1}
                  >
                    <rect
                      x={-formatted.width / 2}
                      y={-labelHeight / 2}
                      width={formatted.width}
                      height={labelHeight}
                      rx={labelHeight / 2}
                      fill="var(--color-surface-container-lowest)"
                      stroke={
                        selected
                          ? "var(--color-primary)"
                          : "var(--color-outline-variant)"
                      }
                      strokeOpacity={selected ? 0.55 : 0.4}
                      filter="url(#node-glow)"
                    />
                    <text
                      textAnchor="middle"
                      className="fill-on-surface text-[11px] font-semibold tracking-tight"
                    >
                      {formatted.lines.map((line, index) => (
                        <tspan
                          key={`${node.id}-${index}`}
                          x={0}
                          dy={
                            index === 0
                              ? lineCount === 1
                                ? "0.35em"
                                : "-0.15em"
                              : "1.15em"
                          }
                        >
                          {line}
                        </tspan>
                      ))}
                    </text>
                  </g>
                );
              })}
            </g>
          </g>
        </svg>
      </div>

      {/* Mode chip — top left */}
      <div className="absolute left-lg top-lg z-10 flex max-w-[min(100%-2rem,22rem)] flex-col gap-2">
        <div className="flex items-center gap-2 rounded-2xl border border-outline-variant/25 bg-surface-container-lowest/92 px-3 py-2 shadow-[0_12px_40px_rgba(24,36,66,0.08)] backdrop-blur-xl">
          {isFocus ? (
            <>
              <button
                type="button"
                onClick={exitFocus}
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant transition-colors outline-none hover:bg-surface-container hover:text-on-surface focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label="Back to overview"
              >
                <MaterialIcon name="arrow_back" size={18} />
              </button>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  Local focus
                </p>
                <p className="truncate text-label-md text-on-surface">
                  {focusNode?.name ?? "Entity"}
                </p>
              </div>
            </>
          ) : (
            <>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                <MaterialIcon name="hub" size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  Overview
                </p>
                <p className="truncate text-label-md text-on-surface">
                  {displayNodes.length} entities · {visibleEdges.length} links ·{" "}
                  {clusterCount} clusters
                </p>
              </div>
            </>
          )}
        </div>
        <p className="px-1 text-[11px] text-on-surface-variant/90 max-sm:hidden">
          Lines mean entities appeared in the same memory.
        </p>
      </div>

      {/* Search + filters — top right */}
      <div className="absolute right-0 top-0 z-10 w-full space-y-md p-lg sm:w-80">
        <div className="rounded-2xl border border-outline-variant/25 bg-surface-container-lowest/92 p-md shadow-[0_12px_40px_rgba(24,36,66,0.08)] backdrop-blur-xl">
          <div className="relative">
            <MaterialIcon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              aria-label="Search knowledge graph"
              placeholder="Search, Enter to focus…"
              className="w-full rounded-xl bg-surface-container-low py-2.5 pl-10 pr-4 text-body-md text-on-surface transition-all outline-none placeholder:text-on-surface-variant focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {categories.length > 0 && (
          <div className="space-y-sm rounded-2xl border border-outline-variant/25 bg-surface-container-lowest/92 p-md shadow-[0_12px_40px_rgba(24,36,66,0.08)] backdrop-blur-xl">
            <h3 className="mb-sm text-label-md uppercase tracking-wider text-on-surface-variant">
              Filter
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={activeCategory === null}
                onClick={() => setActiveCategory(null)}
                className={cn(
                  "flex items-center gap-1 rounded-full px-3 py-1.5 text-label-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  activeCategory === null
                    ? "bg-primary-container text-on-primary-container"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container",
                )}
              >
                All
              </button>
              {categories.map((category) => {
                const style = getCategoryStyle(category);
                const active = activeCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setActiveCategory(active ? null : category)}
                    className={cn(
                      "flex items-center gap-1 rounded-full px-3 py-1.5 text-label-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                      active
                        ? "bg-primary-container text-on-primary-container"
                        : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="size-2 rounded-full"
                      style={{ backgroundColor: style.accent }}
                    />
                    {category}
                  </button>
                );
              })}
            </div>
            {!isFocus && (
              <button
                type="button"
                aria-pressed={showIsolates}
                onClick={() => setShowIsolates((value) => !value)}
                className={cn(
                  "mt-2 flex w-full items-center justify-center gap-1 rounded-xl px-3 py-2 text-label-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  showIsolates
                    ? "bg-secondary-container text-on-secondary-container"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container",
                )}
              >
                <MaterialIcon name="visibility" size={16} />
                {showIsolates ? "Hide isolates" : "Show isolates"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      {/* Zoom / reset — bottom right */}
      <div className="absolute bottom-lg right-lg z-10 flex flex-col gap-2 max-lg:bottom-24">
        {[
          {
            label: "Zoom in",
            icon: "add" as const,
            onClick: () => setZoom((z) => Math.min(2.6, z + 0.2)),
          },
          {
            label: "Zoom out",
            icon: "remove" as const,
            onClick: () => setZoom((z) => Math.max(0.4, z - 0.2)),
          },
          { label: "Fit to screen", icon: "fit_screen" as const, onClick: fitToScreen },
          { label: "Reset view", icon: "refresh" as const, onClick: resetView },
        ].map((control, index) => (
          <button
            key={control.label}
            type="button"
            aria-label={control.label}
            onClick={control.onClick}
            className={cn(
              "flex size-10 items-center justify-center rounded-full border border-outline-variant/25 bg-surface-container-lowest/90 text-on-surface-variant shadow-[0_8px_24px_rgba(24,36,66,0.1)] backdrop-blur-xl transition-all outline-none hover:bg-surface-container hover:text-on-surface focus-visible:ring-2 focus-visible:ring-primary/40",
              index === 2 && "mt-1",
            )}
          >
            <MaterialIcon name={control.icon} />
          </button>
        ))}
      </div>

      {tooltip &&
        (() => {
          const node = nodes.find((n) => n.id === tooltip.nodeId);
          if (!node) return null;
          const kind = getEntityKindStyle(node.kind);
          const topWeight = edges
            .filter((e) => e.source === node.id || e.target === node.id)
            .reduce((max, e) => Math.max(max, e.weight), 0);
          return (
            <div
              className="pointer-events-none fixed z-30 max-w-xs rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 shadow-[0_12px_40px_rgba(24,36,66,0.16)]"
              style={{
                left: Math.min(tooltip.x + 14, window.innerWidth - 220),
                top: Math.min(tooltip.y + 14, window.innerHeight - 100),
              }}
            >
              <p className="text-label-md text-on-surface">{node.name}</p>
              <p className="text-[11px] text-on-surface-variant">
                {kind.label} · {node.mentionCount} mentions
                {topWeight > 0 ? ` · up to ${topWeight} shared` : ""}
              </p>
            </div>
          );
        })()}

      <GraphDetailPanel
        entity={detail}
        accent={selectedAccent}
        loading={detailLoading}
        connections={connectedForPanel}
        onSelectConnection={(id) => void selectEntity(id)}
        onClose={exitFocus}
      />
    </div>
  );
}
