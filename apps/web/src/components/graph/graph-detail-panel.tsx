"use client";

import Link from "next/link";
import { Badge, IconButton, MaterialIcon, Skeleton, cn } from "@lyvora/ui";
import { getCategoryStyle } from "@/lib/categories";
import { formatAbsoluteDate } from "@/lib/format";
import { getEntityKindStyle } from "./entity-kind";

export interface EntityDetail {
  id: string;
  name: string;
  kind: string;
  summary: string | null;
  memories: Array<{
    id: string;
    title: string;
    tldr: string | null;
    category: string;
    savedAt: string;
  }>;
}

export interface GraphConnection {
  id: string;
  name: string;
  kind: string;
  weight: number;
}

/**
 * Right-hand drawer for the local-focus graph. Shows connected entities
 * (shared-memory weights) above the memory list.
 */
export function GraphDetailPanel({
  entity,
  accent,
  loading,
  connections = [],
  onSelectConnection,
  onClose,
}: {
  entity: EntityDetail | null;
  accent: string;
  loading: boolean;
  connections?: GraphConnection[];
  onSelectConnection?: (id: string) => void;
  onClose: () => void;
}) {
  const open = Boolean(entity) || loading;
  const kind = getEntityKindStyle(entity?.kind);

  return (
    <div
      role="complementary"
      aria-label="Entity details"
      aria-hidden={!open}
      className={cn(
        "absolute inset-y-0 right-0 z-20 flex w-full flex-col bg-surface-container-lowest shadow-[-10px_0_30px_rgba(0,0,0,0.05)] transition-transform duration-300 sm:w-96",
        open ? "translate-x-0" : "translate-x-full",
      )}
    >
      <div className="flex items-start justify-between border-b border-surface-container-highest p-lg">
        <div className="min-w-0">
          <div className="mb-xs flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex size-6 items-center justify-center rounded-full"
              style={{ backgroundColor: `${accent}22`, color: accent }}
            >
              <MaterialIcon name={kind.icon} size={14} />
            </span>
            <span className="text-label-sm uppercase text-on-surface-variant">
              {kind.label}
            </span>
          </div>
          <h2 className="truncate text-headline-md text-on-surface">
            {entity?.name ?? "Loading…"}
          </h2>
        </div>
        <IconButton icon="close" label="Close details" size="sm" onClick={onClose} />
      </div>

      <div className="flex-1 space-y-xl overflow-y-auto p-lg">
        {loading && !entity ? (
          <>
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </>
        ) : entity ? (
          <>
            {entity.summary && (
              <div>
                <h3 className="mb-sm text-label-md text-on-surface-variant">Summary</h3>
                <p className="text-body-md leading-relaxed text-on-surface">
                  {entity.summary}
                </p>
              </div>
            )}

            {connections.length > 0 && (
              <div>
                <h3 className="mb-md flex items-center justify-between text-label-md text-on-surface-variant">
                  Connected entities
                  <Badge tone="secondary">{connections.length}</Badge>
                </h3>
                <p className="mb-sm text-[11px] text-on-surface-variant">
                  Shared memory count — click to refocus the graph.
                </p>
                <div className="space-y-2">
                  {connections.map((connection) => {
                    const connectionKind = getEntityKindStyle(connection.kind);
                    return (
                      <button
                        key={connection.id}
                        type="button"
                        onClick={() => onSelectConnection?.(connection.id)}
                        className="flex w-full items-center gap-3 rounded-xl bg-surface-container-low px-3 py-2.5 text-left transition-colors outline-none hover:bg-surface-container focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <span
                          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface-variant"
                          aria-hidden="true"
                        >
                          <MaterialIcon name={connectionKind.icon} size={16} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-label-md text-on-surface">
                            {connection.name}
                          </span>
                          <span className="text-[11px] text-on-surface-variant">
                            {connectionKind.label}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full bg-primary-container px-2 py-0.5 text-[11px] font-semibold text-on-primary-container">
                          {connection.weight} shared
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-md flex items-center justify-between text-label-md text-on-surface-variant">
                Connected Memories
                <Badge tone="secondary">{entity.memories.length}</Badge>
              </h3>
              <div className="space-y-md">
                {entity.memories.length === 0 ? (
                  <p className="text-body-md text-on-surface-variant">
                    No memories are linked to this entity yet.
                  </p>
                ) : (
                  entity.memories.map((memory) => {
                    const style = getCategoryStyle(memory.category);
                    return (
                      <Link
                        key={memory.id}
                        href={`/memory/${memory.id}`}
                        className="group relative block overflow-hidden rounded-xl bg-surface-container-low p-md shadow-sm transition-shadow outline-none hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <span
                          aria-hidden="true"
                          className="absolute inset-y-0 left-0 w-1"
                          style={{ backgroundColor: style.accent }}
                        />
                        <h4 className="mb-1 pl-xs text-label-md text-on-surface transition-colors group-hover:text-primary">
                          {memory.title}
                        </h4>
                        {memory.tldr && (
                          <p className="line-clamp-2 pl-xs text-label-sm font-normal text-on-surface-variant">
                            {memory.tldr}
                          </p>
                        )}
                        <span className="mt-2 block pl-xs text-[10px] text-outline">
                          {formatAbsoluteDate(memory.savedAt)}
                        </span>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {entity && (
        <div className="border-t border-surface-container-highest bg-surface-container-lowest p-lg">
          <Link
            href={`/graph/${entity.id}`}
            className="flex w-full items-center justify-center gap-xs rounded-xl bg-primary py-3 text-label-md text-on-primary shadow-sm transition-colors outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Explore Entity Deep Dive
            <MaterialIcon name="arrow_forward" size={18} />
          </Link>
        </div>
      )}
    </div>
  );
}
