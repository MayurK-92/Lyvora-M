import type { WeeklyReportResult } from "./types";

export interface SendWeeklyReportResult {
  skipped: boolean;
  reason?: string;
  id?: string;
}

function buildHtml(report: WeeklyReportResult, appUrl: string): string {
  const p = report.payload;
  const delta =
    p.savedDelta === 0
      ? "same as last week"
      : p.savedDelta > 0
        ? `+${p.savedDelta} vs last week`
        : `${p.savedDelta} vs last week`;
  const cats = p.topCategories
    .map((c) => `<li>${escapeHtml(c.category)} (${c.count})</li>`)
    .join("");
  const revisits = p.recommendedRevisits
    .map(
      (m) =>
        `<li><a href="${appUrl}/memory/${m.id}">${escapeHtml(m.title)}</a></li>`,
    )
    .join("");

  return `<!doctype html>
<html><body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
  <h1 style="font-size: 20px;">Your Lyvora week</h1>
  <p>${escapeHtml(report.narrative ?? "")}</p>
  <p><strong>${p.savedThisWeek}</strong> saved this week (${escapeHtml(delta)})</p>
  ${cats ? `<h2 style="font-size: 16px;">Top categories</h2><ul>${cats}</ul>` : ""}
  <p>${p.neverRevisitedCount} saves never revisited</p>
  ${revisits ? `<h2 style="font-size: 16px;">Worth another look</h2><ul>${revisits}</ul>` : ""}
  <p style="color:#666;font-size:13px;">
    Knowledge: ${p.growth.totalMemories} memories · ${p.growth.totalEntities} entities · ${p.growth.totalEdges} edges
  </p>
  <p><a href="${appUrl}/report">Open full report</a></p>
</body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendWeeklyReportEmail(input: {
  to: string;
  report: WeeklyReportResult;
}): Promise<SendWeeklyReportResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    return { skipped: true, reason: "RESEND_API_KEY or RESEND_FROM not set" };
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: `Lyvora weekly report · week of ${input.report.weekStart}`,
      html: buildHtml(input.report, appUrl),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { id?: string };
  return { skipped: false, id: data.id };
}
