import { eq } from "drizzle-orm";
import { createServiceDbClient } from "../db/client";
import { profiles } from "../db/schema";
import { sendWeeklyReportEmail, type SendWeeklyReportResult } from "./email";
import type { WeeklyReportResult } from "./types";

export async function sendWeeklyReportForUser(
  userId: string,
  report: WeeklyReportResult,
): Promise<SendWeeklyReportResult> {
  const db = createServiceDbClient();
  const [profile] = await db
    .select({ email: profiles.email })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  if (!profile?.email) {
    return { skipped: true, reason: "no email on profile" };
  }
  return sendWeeklyReportEmail({ to: profile.email, report });
}
