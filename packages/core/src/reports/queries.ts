import { and, desc, eq, sql } from "drizzle-orm";
import { createServiceDbClient } from "../db/client";
import { weeklyReports } from "../db/schema";
import type { WeeklyReportPayload, WeeklyReportResult } from "./types";

function toResult(row: typeof weeklyReports.$inferSelect): WeeklyReportResult {
  return {
    id: row.id,
    userId: row.userId,
    weekStart: String(row.weekStart),
    payload: row.payload as WeeklyReportPayload,
    narrative: row.narrative,
    createdAt: row.createdAt,
  };
}

export async function getLatestWeeklyReport(
  userId: string,
): Promise<WeeklyReportResult | null> {
  const db = createServiceDbClient();
  const [row] = await db
    .select()
    .from(weeklyReports)
    .where(eq(weeklyReports.userId, userId))
    .orderBy(desc(weeklyReports.weekStart))
    .limit(1);
  return row ? toResult(row) : null;
}

export async function getWeeklyReportByWeek(
  userId: string,
  weekStart: string,
): Promise<WeeklyReportResult | null> {
  const db = createServiceDbClient();
  const [row] = await db
    .select()
    .from(weeklyReports)
    .where(
      and(
        eq(weeklyReports.userId, userId),
        sql`${weeklyReports.weekStart} = ${weekStart}::date`,
      ),
    )
    .limit(1);
  return row ? toResult(row) : null;
}
