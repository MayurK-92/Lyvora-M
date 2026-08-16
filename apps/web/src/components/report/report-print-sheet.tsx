import type { WeeklyReportPayload } from "@lyvora/core";
import { formatDateRange } from "@/lib/format";

export interface ReportPrintSheetProps {
  weekStart: string;
  weekEnd: string;
  narrative: string | null;
  payload: WeeklyReportPayload;
  rediscoveryScore: number;
  focusTopic: string;
}

/**
 * Screen-hidden one-page digest. Shown only when printing / saving as PDF.
 * Kept deliberately plain so it fits a single A4 page.
 */
export function ReportPrintSheet({
  weekStart,
  weekEnd,
  narrative,
  payload,
  rediscoveryScore,
  focusTopic,
}: ReportPrintSheetProps) {
  const categories = payload.topCategories
    .filter((item) => item.category !== "Uncategorized")
    .slice(0, 5);
  const tags = payload.emergingTags.slice(0, 5);
  const mostViewed = payload.mostViewed.slice(0, 4);
  const rediscover = payload.recommendedRevisits.slice(0, 3);
  const delta =
    payload.savedDelta === 0
      ? "same as last week"
      : `${payload.savedDelta > 0 ? "+" : ""}${payload.savedDelta} vs last week`;

  return (
    <article
      id="report-print-sheet"
      className="report-print-sheet print-only"
      aria-hidden="true"
    >
      <header className="report-print-header">
        <div>
          <p className="report-print-brand">Lyvora</p>
          <h1>Weekly Synthesis</h1>
          <p className="report-print-meta">{formatDateRange(weekStart, weekEnd)}</p>
        </div>
        <p className="report-print-meta report-print-align-end">One-page digest</p>
      </header>

      <section className="report-print-stats">
        <div>
          <span className="report-print-stat-label">Saved</span>
          <strong>{payload.savedThisWeek}</strong>
          <span className="report-print-stat-note">{delta}</span>
        </div>
        <div>
          <span className="report-print-stat-label">Library</span>
          <strong>{payload.growth.totalMemories}</strong>
          <span className="report-print-stat-note">memories</span>
        </div>
        <div>
          <span className="report-print-stat-label">Connections</span>
          <strong>{payload.growth.totalEdges}</strong>
          <span className="report-print-stat-note">edges</span>
        </div>
        <div>
          <span className="report-print-stat-label">Rediscovery</span>
          <strong>{rediscoveryScore}%</strong>
          <span className="report-print-stat-note">
            {payload.neverRevisitedCount} never opened
          </span>
        </div>
      </section>

      {narrative && (
        <section className="report-print-block">
          <h2>Summary</h2>
          <p>{narrative}</p>
        </section>
      )}

      <div className="report-print-columns">
        <section className="report-print-block">
          <h2>Top categories</h2>
          {categories.length === 0 ? (
            <p className="report-print-empty">No category activity this week.</p>
          ) : (
            <ul>
              {categories.map((item) => (
                <li key={item.category}>
                  <span>{item.category}</span>
                  <span>
                    {item.count} {item.count === 1 ? "save" : "saves"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="report-print-block">
          <h2>Emerging topics</h2>
          {tags.length === 0 ? (
            <p className="report-print-empty">No rising tags this week.</p>
          ) : (
            <p className="report-print-tags">
              {tags.map((tag) => `#${tag.tag.replace(/^#/, "")}`).join("  ·  ")}
            </p>
          )}
        </section>
      </div>

      <div className="report-print-columns">
        <section className="report-print-block">
          <h2>Most revisited</h2>
          {mostViewed.length === 0 ? (
            <p className="report-print-empty">No revisits recorded yet.</p>
          ) : (
            <ol>
              {mostViewed.map((item) => (
                <li key={item.id}>
                  <span>{item.title}</span>
                  <span>
                    {item.viewCount} {item.viewCount === 1 ? "view" : "views"}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="report-print-block">
          <h2>Worth revisiting</h2>
          {rediscover.length === 0 ? (
            <p className="report-print-empty">Nothing queued for rediscovery.</p>
          ) : (
            <ul>
              {rediscover.map((item) => (
                <li key={item.id}>
                  <span>{item.title}</span>
                  <span>{item.category}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="report-print-block report-print-focus">
        <h2>Next week&apos;s focus</h2>
        <p>
          Go deeper on <strong>{focusTopic}</strong> using what you&apos;ve already saved.
        </p>
      </section>

      <footer className="report-print-footer">
        Generated by Lyvora · Save as PDF from the print dialog
      </footer>
    </article>
  );
}
