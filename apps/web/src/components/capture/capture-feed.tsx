"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MaterialIcon } from "@lyvora/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { MemoryCard, type MemoryCardData } from "@/components/memory/memory-card";
import { CompactMemoryCard } from "@/components/memory/compact-memory-card";
import { OnboardingCard } from "@/components/onboarding/onboarding-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { SectionHeading } from "@/components/layout/section-heading";
import { formatRelativeDate } from "@/lib/format";
import {
  CaptureBar,
  type CapturePipelineStatus,
  type PendingCapture,
} from "./capture-bar";
import { CaptureProgressCard } from "./capture-progress";

interface CaptureRow {
  id: string;
  status: string;
  raw_input: string | null;
  memory_id: string | null;
  last_error: string | null;
  created_at: string;
}

function asPipelineStatus(value: string): CapturePipelineStatus {
  switch (value) {
    case "queued":
    case "fetching":
    case "extracting":
    case "enriching":
    case "embedding":
    case "done":
    case "failed":
    case "duplicate":
      return value;
    default:
      return "queued";
  }
}

function isActiveStatus(status: CapturePipelineStatus) {
  return (
    status === "queued" ||
    status === "fetching" ||
    status === "extracting" ||
    status === "enriching" ||
    status === "embedding"
  );
}

export interface RediscoveryItem {
  id: string;
  title: string;
  tldr: string | null;
  category: string;
  tags: string[];
  savedAt?: string;
  reason: string;
}

export function CaptureFeed({
  initialMemories,
  rediscovery = [],
  shareError = null,
}: {
  initialMemories: MemoryCardData[];
  rediscovery?: RediscoveryItem[];
  shareError?: string | null;
}) {
  const [memories, setMemories] = useState(initialMemories);
  const [pending, setPending] = useState<PendingCapture[]>([]);
  const [freshIds, setFreshIds] = useState<Set<string>>(() => new Set());
  const clearTimers = useRef<Map<string, number>>(new Map());
  const freshTimers = useRef<Map<string, number>>(new Map());

  const clearLater = useCallback((captureId: string, ms: number) => {
    const existing = clearTimers.current.get(captureId);
    if (existing) window.clearTimeout(existing);
    const timer = window.setTimeout(() => {
      setPending((prev) => prev.filter((p) => p.captureId !== captureId));
      clearTimers.current.delete(captureId);
    }, ms);
    clearTimers.current.set(captureId, timer);
  }, []);

  const applyCaptureRow = useCallback(
    async (row: CaptureRow) => {
      const status = asPipelineStatus(row.status);
      const supabase = createSupabaseBrowserClient();

      if (isActiveStatus(status)) {
        setPending((prev) => {
          const existing = prev.find((p) => p.captureId === row.id);
          if (!existing) {
            return [
              {
                captureId: row.id,
                url: row.raw_input ?? "Saving…",
                createdAt: row.created_at,
                status,
                lastError: row.last_error,
              },
              ...prev,
            ];
          }
          if (existing.status === status && existing.lastError === row.last_error) {
            return prev;
          }
          return prev.map((p) =>
            p.captureId === row.id ? { ...p, status, lastError: row.last_error } : p,
          );
        });
        return;
      }

      if (status === "failed") {
        setPending((prev) =>
          prev.map((p) =>
            p.captureId === row.id
              ? { ...p, status: "failed", lastError: row.last_error }
              : p,
          ),
        );
        clearLater(row.id, 8000);
        return;
      }

      if (status === "done" || status === "duplicate") {
        setPending((prev) =>
          prev.map((p) => (p.captureId === row.id ? { ...p, status, lastError: null } : p)),
        );

        if (row.memory_id) {
          const { data } = await supabase
            .from("memories")
            .select(
              "id, title, tldr, category, tags, source_url, site_name, hero_image_url, saved_at",
            )
            .eq("id", row.memory_id)
            .maybeSingle();

          if (data) {
            const card: MemoryCardData = {
              id: data.id,
              title: data.title,
              tldr: data.tldr,
              category: data.category,
              tags: data.tags ?? [],
              sourceUrl: data.source_url,
              siteName: data.site_name,
              heroImageUrl: data.hero_image_url,
              savedAt: data.saved_at,
              status: "done",
            };
            setMemories((prev) => {
              if (prev.some((m) => m.id === card.id)) {
                return prev.map((m) => (m.id === card.id ? card : m));
              }
              return [card, ...prev];
            });
            setFreshIds((prev) => {
              const next = new Set(prev);
              next.add(card.id);
              return next;
            });
            const existing = freshTimers.current.get(card.id);
            if (existing) window.clearTimeout(existing);
            freshTimers.current.set(
              card.id,
              window.setTimeout(() => {
                setFreshIds((prev) => {
                  const next = new Set(prev);
                  next.delete(card.id);
                  return next;
                });
                freshTimers.current.delete(card.id);
              }, 900),
            );
          }
        }

        clearLater(row.id, 700);
      }
    },
    [clearLater],
  );

  // Realtime — best effort. Hosted Supabase often needs REPLICA IDENTITY FULL
  // for UPDATE events; polling below covers gaps.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("captures-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "captures" },
        (payload) => {
          const row = payload.new as CaptureRow | undefined;
          if (!row?.id) return;
          void applyCaptureRow(row);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [applyCaptureRow]);

  // Poll active captures so the progress bar advances even if Realtime drops UPDATEs.
  useEffect(() => {
    const active = pending.filter((p) => isActiveStatus(p.status));
    if (active.length === 0) return;

    const supabase = createSupabaseBrowserClient();
    let cancelled = false;

    async function poll() {
      const ids = active.map((p) => p.captureId);
      const { data, error } = await supabase
        .from("captures")
        .select("id, status, raw_input, memory_id, last_error, created_at")
        .in("id", ids);

      if (cancelled || error || !data) return;
      for (const row of data as CaptureRow[]) {
        await applyCaptureRow(row);
      }
    }

    void poll();
    const interval = window.setInterval(() => {
      void poll();
    }, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [pending, applyCaptureRow]);

  useEffect(() => {
    const timers = clearTimers.current;
    const fresh = freshTimers.current;
    return () => {
      for (const timer of timers.values()) window.clearTimeout(timer);
      timers.clear();
      for (const timer of fresh.values()) window.clearTimeout(timer);
      fresh.clear();
    };
  }, []);

  const hasFeed = pending.length > 0 || memories.length > 0;

  return (
    <div className="relative flex w-full flex-col pb-40">
      <PageContainer className="space-y-xl">
        <header className="mb-2xl flex flex-col items-start pt-lg">
          <h1 className="mb-xs text-headline-lg-mobile tracking-tight text-on-surface sm:text-display-lg">
            Your Digital Mind.
          </h1>
          <p className="max-w-2xl text-body-lg text-on-surface-variant">
            Capture, organize, and synthesize your thoughts effortlessly.
          </p>
        </header>

        {shareError && (
          <p
            role="alert"
            className="rounded-xl border border-error/30 bg-error-container px-md py-sm text-body-md text-on-error-container"
          >
            Couldn&apos;t save shared item: {shareError}
          </p>
        )}

        <OnboardingCard />

        <section className="mb-2xl">
          <SectionHeading
            icon="memory"
            title="Recent Memories"
            action={
              hasFeed ? (
                <Link
                  href="/search"
                  className="flex items-center gap-xs text-label-md text-primary transition-colors hover:text-primary-fixed-dim"
                >
                  View All
                  <MaterialIcon name="arrow_forward" size={16} />
                </Link>
              ) : undefined
            }
          />

          {!hasFeed ? (
            <EmptyState
              icon="memory"
              title="Nothing saved yet"
              message="Paste a link, note, PDF, or image in the bar below to create your first memory."
            />
          ) : (
            <div className="grid grid-cols-1 gap-lg md:grid-cols-2 lg:grid-cols-3">
              {pending.map((item) => (
                <CaptureProgressCard
                  key={item.captureId}
                  url={item.url}
                  status={item.status}
                  lastError={item.lastError}
                />
              ))}
              {memories.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  className={freshIds.has(memory.id) ? "animate-capture-in" : undefined}
                />
              ))}
            </div>
          )}
        </section>

        {rediscovery.length > 0 && (
          <section className="relative mt-2xl overflow-hidden rounded-2xl bg-surface-container-low p-lg">
            <div
              aria-hidden="true"
              className="absolute -right-24 -top-24 size-64 rounded-full bg-primary-fixed/20 blur-3xl mix-blend-multiply"
            />
            <div className="relative z-10 mb-lg flex items-center gap-sm">
              <MaterialIcon name="auto_awesome" className="text-secondary" />
              <h2 className="text-headline-md text-on-surface">Rediscover</h2>
              <div aria-hidden="true" className="ml-md h-px flex-1 bg-outline-variant/30" />
            </div>
            <div className="relative z-10 grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
              {rediscovery.slice(0, 6).map((item) => (
                <CompactMemoryCard
                  key={item.id}
                  memory={item}
                  meta={item.reason || formatRelativeDate(item.savedAt)}
                />
              ))}
            </div>
          </section>
        )}
      </PageContainer>

      <CaptureBar onQueued={(item) => setPending((prev) => [item, ...prev])} />
    </div>
  );
}
