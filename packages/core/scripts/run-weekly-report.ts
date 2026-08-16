import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  generateWeeklyReport,
  recomputeInterests,
  sendWeeklyReportForUser,
} from "../src/index.ts";

const envPath = resolve(import.meta.dirname, "../../../apps/web/.env.local");
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  process.env[trimmed.slice(0, eq)] ??= trimmed.slice(eq + 1);
}

const userId = process.argv[2];
if (!userId) {
  console.error("Usage: pnpm dlx tsx ./scripts/run-weekly-report.ts <userId>");
  process.exit(1);
}

const interests = await recomputeInterests(userId);
const report = await generateWeeklyReport(userId);
const email = await sendWeeklyReportForUser(userId, report);
console.log({
  interestsUpdatedAt: interests.updatedAt,
  weekStart: report.weekStart,
  savedThisWeek: report.payload.savedThisWeek,
  narrative: report.narrative,
  email,
});
console.log("OK");
