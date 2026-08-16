import { generateText } from "ai";
import { models } from "../ai/models";
import { createServiceDbClient } from "../db/client";
import { weeklyReports } from "../db/schema";
import { aggregateWeeklyReport } from "./aggregate";
import { cleanupEvalSeedForUser } from "./eval-seed";
import type { WeeklyReportPayload, WeeklyReportResult } from "./types";

async function writeNarrative(payload: WeeklyReportPayload): Promise<string> {
  const { text } = await generateText({
    model: models.reason,
    system:
      "Write a short (2–4 sentence) personal weekly memory digest. Warm, specific, no hype. Use only the stats provided. Do not invent titles.",
    prompt: JSON.stringify({
      weekStart: payload.weekStart,
      savedThisWeek: payload.savedThisWeek,
      savedDelta: payload.savedDelta,
      topCategories: payload.topCategories,
      emergingTags: payload.emergingTags.slice(0, 5),
      neverRevisitedCount: payload.neverRevisitedCount,
      recommended: payload.recommendedRevisits.map((m) => m.title),
      growth: payload.growth,
    }),
    maxRetries: 1,
  });
  return text.trim().slice(0, 800);
}

export async function generateWeeklyReport(
  userId: string,
  asOf: Date = new Date(),
): Promise<WeeklyReportResult> {
  // Drop leftover M6 eval seeds so digests reflect real saves only.
  await cleanupEvalSeedForUser(userId);

  const db = createServiceDbClient();
  const payload = await aggregateWeeklyReport(userId, asOf);
  let narrative: string | null = null;
  try {
    narrative = await writeNarrative(payload);
  } catch {
    narrative = `You saved ${payload.savedThisWeek} item${payload.savedThisWeek === 1 ? "" : "s"} this week (${payload.savedDelta >= 0 ? "+" : ""}${payload.savedDelta} vs last week). ${payload.neverRevisitedCount} saves still await a revisit.`;
  }

  const inserted = await db
    .insert(weeklyReports)
    .values({
      userId,
      weekStart: payload.weekStart,
      payload,
      narrative,
    })
    .onConflictDoUpdate({
      target: [weeklyReports.userId, weeklyReports.weekStart],
      set: {
        payload,
        narrative,
      },
    })
    .returning();

  const row = inserted[0];
  if (!row) {
    throw new Error("Failed to upsert weekly_reports row");
  }

  return {
    id: row.id,
    userId: row.userId,
    weekStart: String(row.weekStart),
    payload: row.payload as WeeklyReportPayload,
    narrative: row.narrative,
    createdAt: row.createdAt,
  };
}
