import Link from "next/link";
import { getLatestWeeklyReport, listMostRevisitedMemories } from "@lyvora/core";
import type { WeeklyReportPayload } from "@lyvora/core";
import { Chip, MaterialIcon, cn } from "@lyvora/ui";
import { CategoryDonut } from "@/components/report/category-donut";
import { ExportReportButton } from "@/components/report/export-report-button";
import { GenerateReportButton } from "@/components/report/generate-report-button";
import { ReportPrintSheet } from "@/components/report/report-print-sheet";
import {
  NetworkDecoration,
  ReportStatCard,
} from "@/components/report/report-stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { requireUser } from "@/lib/auth/session";
import { getCategoryStyle } from "@/lib/categories";
import { formatDateRange } from "@/lib/format";

interface Insight {
  text: string;
  accent: string;
  pill: string;
}

/** Turn the aggregate payload into accent-railed insight rows. */
function buildInsights(p: WeeklyReportPayload): Insight[] {
  const insights: Insight[] = [];

  const [top] = p.topCategories.filter((item) => item.category !== "Uncategorized");
  if (top) {
    insights.push({
      text: `${top.category} led your saves this week.`,
      accent: "bg-tertiary-container/30 group-hover:bg-tertiary-container",
      pill: `${top.count} ${top.count === 1 ? "memory" : "memories"}`,
    });
  }

  const tags = p.emergingTags.slice(0, 3);
  if (tags.length > 0) {
    insights.push({
      text: `Topics rising across your library: ${tags
        .map((tag) => `#${tag.tag.replace(/^#/, "")}`)
        .join(", ")}.`,
      accent: "bg-primary/30 group-hover:bg-primary",
      pill: `${tags.reduce((sum, tag) => sum + tag.count, 0)} mentions`,
    });
  }

  if (p.neverRevisitedCount > 0) {
    insights.push({
      text: `${p.neverRevisitedCount} ${
        p.neverRevisitedCount === 1 ? "save is" : "saves are"
      } still waiting for a first revisit.`,
      accent: "bg-secondary/30 group-hover:bg-secondary",
      pill: "Worth another look",
    });
  }

  return insights;
}

function gradeFor(score: number): string {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  return "D";
}

export default async function ReportPage() {
  const user = await requireUser();
  const report = await getLatestWeeklyReport(user.id);

  if (!report) {
    return (
      <PageContainer>
        <header className="mb-xl">
          <p className="text-label-md uppercase tracking-widest text-on-surface-variant">
            Weekly report
          </p>
          <h1 className="mt-xs text-headline-lg-mobile tracking-tight text-on-surface sm:text-display-lg">
            Weekly Synthesis
          </h1>
          <p className="mt-sm max-w-xl text-body-md text-on-surface-variant">
            Build a digest from what you&apos;ve saved this week — categories, revisits, and a
            short narrative. You can refresh anytime; Mondays also generate one automatically.
          </p>
        </header>
        <div className="flex flex-col items-center gap-lg rounded-3xl border border-dashed border-outline-variant/50 bg-surface-container-low/40 px-lg py-2xl text-center">
          <EmptyState
            icon="bar_chart"
            title="No digest yet"
            message="Generate this week's report from your real saves. Fake test rows from old evals are cleaned up automatically."
            className="border-0 bg-transparent py-0"
          />
          <GenerateReportButton label="Generate this week’s report" />
        </div>
      </PageContainer>
    );
  }

  const liveMostViewed = await listMostRevisitedMemories(user.id, {
    limit: 5,
    weekStart: report.payload.weekStart,
    weekEnd: report.payload.weekEnd,
  });

  const p: WeeklyReportPayload = {
    ...report.payload,
    mostViewed:
      liveMostViewed.length > 0 ? liveMostViewed : report.payload.mostViewed,
  };
  const insights = buildInsights(p);
  const revisited = Math.max(p.growth.totalMemories - p.neverRevisitedCount, 0);
  const rediscoveryScore =
    p.growth.totalMemories > 0
      ? Math.round((revisited / p.growth.totalMemories) * 100)
      : 0;
  const deltaLabel =
    p.savedDelta === 0
      ? "same as last week"
      : `${p.savedDelta > 0 ? "+" : ""}${p.savedDelta} vs last`;
  const focusTopic =
    p.topCategories.find((item) => item.category !== "Uncategorized")?.category ??
    p.emergingTags[0]?.tag.replace(/^#/, "") ??
    "what you saved this week";
  const learningPathDraft = `Build a practical learning path for ${focusTopic} from my saved memories. Use only what I've already saved, order steps from fundamentals to advanced, and cite the memories you rely on.`;

  return (
    <>
      <div className="print-screen-only relative mx-auto w-full max-w-page space-y-2xl overflow-hidden px-md py-xl md:px-lg">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -mr-32 -mt-32 right-0 top-0 size-96 rounded-full bg-primary-fixed-dim/20 blur-[100px] mix-blend-multiply"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -ml-32 bottom-1/4 left-0 size-64 rounded-full bg-tertiary-fixed-dim/20 blur-[80px] mix-blend-multiply"
      />

      <section className="animate-fade-in relative z-10 flex flex-col justify-between gap-lg md:flex-row md:items-end">
        <div className="space-y-xs">
          <div className="flex flex-wrap items-center gap-sm">
            <span className="text-label-md uppercase tracking-widest text-on-surface-variant">
              Weekly report
            </span>
            <span aria-hidden="true" className="pulse-animation size-1.5 rounded-full bg-primary" />
            <span className="text-label-md font-medium text-on-surface-variant">
              {formatDateRange(p.weekStart, p.weekEnd)}
            </span>
          </div>
          <h1 className="text-headline-lg-mobile tracking-tight text-on-surface sm:text-display-lg">
            Weekly Synthesis
          </h1>
          <p className="mt-sm max-w-2xl text-body-lg leading-relaxed text-on-surface-variant">
            You captured{" "}
            <strong className="font-semibold text-primary">
              {p.savedThisWeek} new {p.savedThisWeek === 1 ? "memory" : "memories"}
            </strong>{" "}
            this week
            {p.topCategories.filter((c) => c.category !== "Uncategorized").length > 0 ? (
              <>
                , with the most activity in{" "}
                {p.topCategories
                  .filter((item) => item.category !== "Uncategorized")
                  .slice(0, 2)
                  .map((item, index, list) => {
                    const style = getCategoryStyle(item.category);
                    return (
                      <span key={item.category}>
                        <Chip
                          size="sm"
                          icon={style.icon}
                          className={cn("align-middle", style.chip)}
                        >
                          {item.category}
                        </Chip>
                        {index < list.length - 1 ? " and " : ""}
                      </span>
                    );
                  })}
                .
              </>
            ) : (
              "."
            )}
          </p>
          {report.narrative && (
            <p className="max-w-2xl text-body-md leading-relaxed text-on-surface-variant">
              {report.narrative}
            </p>
          )}
        </div>

        <div className="print-hidden flex flex-wrap items-center gap-sm">
          <GenerateReportButton mode="refresh" label="Refresh" />
          <ExportReportButton />
        </div>
      </section>

      <section className="relative z-10 grid grid-cols-2 gap-md lg:grid-cols-4">
        <ReportStatCard
          icon="save"
          label="Memories saved"
          value={String(p.savedThisWeek)}
          unit="this week"
          badge={
            <span className="rounded-full bg-surface-container px-2 py-1 text-label-sm text-on-surface-variant">
              {deltaLabel}
            </span>
          }
        />
        <ReportStatCard
          icon="hub"
          iconClassName="text-tertiary-fixed-dim group-hover:text-tertiary-container"
          label="Graph connections"
          value={String(p.growth.totalEdges)}
          unit="edges"
          decoration={<NetworkDecoration />}
        />
        <ReportStatCard
          icon="category"
          iconClassName="text-secondary-fixed-dim group-hover:text-secondary"
          label="Active categories"
          value={String(p.topCategories.length)}
          unit="this week"
        />
        <ReportStatCard
          icon="psychology"
          iconClassName="text-on-secondary-container"
          label="Rediscovery score"
          value={String(rediscoveryScore)}
          unit="%"
          className="bg-gradient-to-br from-surface-container-lowest to-secondary-container/10"
          badge={
            <span className="flex size-8 items-center justify-center rounded-full bg-secondary-container text-label-sm font-bold text-on-secondary-container shadow-inner">
              {gradeFor(rediscoveryScore)}
            </span>
          }
          footer={
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-container">
              <div
                className="h-full rounded-full bg-secondary"
                style={{ width: `${rediscoveryScore}%` }}
              />
            </div>
          }
        />
      </section>

      <div className="relative z-10 grid grid-cols-1 gap-xl lg:grid-cols-12">
        <div
          className={cn(
            "flex flex-col gap-xl",
            p.recommendedRevisits.length > 0 ? "lg:col-span-8" : "lg:col-span-12",
          )}
        >
          {insights.length > 0 && (
            <section className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-lg shadow-sm sm:p-xl">
              <div className="mb-lg flex items-center gap-sm">
                <MaterialIcon
                  name="auto_awesome"
                  className="rounded-xl bg-primary-fixed/50 p-2 text-primary"
                />
                <h2 className="text-headline-md text-on-surface">Synthesized insights</h2>
              </div>
              <div className="space-y-md">
                {insights.map((insight, index) => (
                  <div key={insight.text}>
                    {index > 0 && <hr className="mb-md border-outline-variant/30" />}
                    <div className="group flex gap-md">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "w-1 shrink-0 rounded-full transition-colors",
                          insight.accent,
                        )}
                      />
                      <div className="py-sm">
                        <p className="text-body-lg leading-relaxed text-on-surface">
                          {insight.text}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <span className="rounded-full border border-outline-variant/50 bg-surface-container-low px-3 py-1 text-label-sm text-on-surface-variant">
                            {insight.pill}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {p.topCategories.length > 0 && (
            <section className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-lg shadow-sm sm:p-xl">
              <h2 className="mb-lg text-headline-md text-on-surface">
                Category distribution
              </h2>
              <CategoryDonut slices={p.topCategories} />
            </section>
          )}

          {p.stale.length > 0 && (
            <section className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-lg shadow-sm sm:p-xl">
              <h2 className="mb-lg flex items-center gap-sm text-headline-md text-on-surface">
                <MaterialIcon name="history" className="text-on-surface-variant" />
                Possibly outdated
              </h2>
              <ul className="space-y-sm">
                {p.stale.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-xl bg-surface-container-low px-md py-sm"
                  >
                    <Link
                      href={`/memory/${item.id}`}
                      className="text-label-md text-on-surface outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      {item.title}
                    </Link>
                    <p className="mt-0.5 text-label-sm font-normal text-on-surface-variant">
                      {item.reason}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {insights.length === 0 &&
            p.topCategories.length === 0 &&
            p.stale.length === 0 &&
            p.savedThisWeek === 0 && (
              <section className="rounded-3xl border border-dashed border-outline-variant/40 bg-surface-container-low/50 p-lg sm:p-xl">
                <h2 className="text-headline-md text-on-surface">Quiet week so far</h2>
                <p className="mt-sm max-w-lg text-body-md text-on-surface-variant">
                  Save a few links, then hit Refresh to rebuild this digest from your library.
                </p>
                <div className="mt-md">
                  <GenerateReportButton mode="refresh" label="Refresh report" />
                </div>
              </section>
            )}
        </div>

        {p.recommendedRevisits.length > 0 && (
          <div className="flex flex-col gap-xl lg:col-span-4">
            <section className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-outline-variant/20 bg-surface-container p-lg shadow-inner">
              <div className="relative z-10 mb-lg">
                <h2 className="flex items-center gap-xs text-headline-md text-on-surface">
                  <MaterialIcon name="history" className="text-secondary" />
                  Rediscover
                </h2>
                <p className="mt-1 text-label-sm text-on-surface-variant">
                  Older saves worth opening again
                </p>
              </div>
              <div className="relative z-10 space-y-md">
                {p.recommendedRevisits.map((item) => {
                  const style = getCategoryStyle(item.category);
                  return (
                    <Link
                      key={item.id}
                      href={`/memory/${item.id}`}
                      className="group relative block overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-md shadow-sm transition-transform outline-none hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-0 left-0 w-1"
                        style={{ backgroundColor: style.accent }}
                      />
                      <div className="min-w-0 pl-sm">
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                          {item.category}
                        </span>
                        <h4 className="truncate text-label-md text-on-surface transition-colors group-hover:text-primary">
                          {item.title}
                        </h4>
                        {item.tldr && (
                          <p className="mt-1 line-clamp-2 text-body-md text-on-surface-variant">
                            {item.tldr}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </div>

      {(p.mostViewed.length > 0 || Boolean(focusTopic)) && (
        <div className="relative z-10 grid grid-cols-1 items-stretch gap-lg lg:grid-cols-12">
          {p.mostViewed.length > 0 && (
            <section className="flex flex-col rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-lg shadow-sm sm:p-xl lg:col-span-7">
              <h2 className="mb-md flex items-center gap-sm text-headline-md text-on-surface">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary-fixed/60 text-primary">
                  <MaterialIcon name="visibility" size={20} />
                </span>
                Most revisited
              </h2>
              <ul className="flex flex-1 flex-col gap-2">
                {p.mostViewed.map((item) => {
                  const style = getCategoryStyle(item.category);
                  return (
                    <li key={item.id}>
                      <Link
                        href={`/memory/${item.id}`}
                        className="group flex items-center gap-3 rounded-2xl bg-surface-container-low px-3 py-3 outline-none transition-colors hover:bg-surface-container focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <span
                          aria-hidden="true"
                          className="h-10 w-1 shrink-0 rounded-full"
                          style={{ backgroundColor: style.accent }}
                        />
                        <span
                          aria-hidden="true"
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-xl",
                            style.tile,
                          )}
                        >
                          <MaterialIcon name={style.icon} size={18} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-label-md text-on-surface transition-colors group-hover:text-primary">
                            {item.title}
                          </span>
                          <span className="mt-0.5 block text-label-sm text-on-surface-variant">
                            {item.category}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full bg-surface-container-lowest px-2.5 py-1 text-[11px] font-semibold tabular-nums text-on-surface-variant">
                          {item.viewCount}{" "}
                          {item.viewCount === 1 ? "view" : "views"}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section
            className={cn(
              "relative flex flex-col overflow-hidden rounded-3xl bg-primary-container p-lg text-on-primary-container shadow-md sm:p-xl",
              p.mostViewed.length > 0 ? "lg:col-span-5" : "lg:col-span-12",
            )}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-primary/15 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-16 -left-8 size-36 rounded-full bg-primary-fixed/20 blur-3xl"
            />
            <div className="relative z-10 flex min-h-[11rem] flex-1 flex-col">
              <div className="mb-md flex items-center gap-sm">
                <span className="flex size-9 items-center justify-center rounded-xl bg-on-primary-container/10 text-on-primary-container">
                  <MaterialIcon name="track_changes" size={20} />
                </span>
                <h2 className="text-headline-md text-on-primary-container">
                  Next week&apos;s focus
                </h2>
              </div>
              <p className="mb-lg max-w-prose text-body-lg leading-relaxed text-on-primary-container/90">
                Based on your recent saves, consider going deeper on{" "}
                <strong className="font-semibold text-on-primary-container">
                  {focusTopic}
                </strong>
                . Chat opens with a draft you can edit before sending.
              </p>
              <Link
                href={`/chat?draft=${encodeURIComponent(learningPathDraft)}`}
                className="mt-auto flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-fixed px-md py-3 text-label-md text-on-primary-fixed shadow-sm transition-colors outline-none hover:bg-primary-fixed/90 focus-visible:ring-2 focus-visible:ring-on-primary-container/40"
              >
                Open learning path in Chat
                <MaterialIcon name="arrow_forward" size={18} />
              </Link>
            </div>
          </section>
        </div>
      )}
      </div>

      <ReportPrintSheet
        weekStart={p.weekStart}
        weekEnd={p.weekEnd}
        narrative={report.narrative}
        payload={p}
        rediscoveryScore={rediscoveryScore}
        focusTopic={focusTopic}
      />
    </>
  );
}
