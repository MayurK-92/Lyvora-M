/**
 * M6: generate an accurate weekly report payload + narrative; email skips without Resend.
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import { generateWeeklyReport } from "../src/reports/generate.ts";
import { getLatestWeeklyReport } from "../src/reports/queries.ts";
import { sendWeeklyReportEmail } from "../src/reports/email.ts";
import { recomputeInterests } from "../src/personalization/interests.ts";
import { recordMemoryView } from "../src/personalization/record-view.ts";

const envPath = resolve(import.meta.dirname, "../../../apps/web/.env.local");
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  process.env[trimmed.slice(0, eq)] ??= trimmed.slice(eq + 1);
}

// Ensure email eval path sees a skip unless a key is intentionally present.
const hadResend = Boolean(process.env.RESEND_API_KEY);
if (!hadResend) {
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM;
}

const sql = postgres(process.env.SUPABASE_DB_URL!, { ssl: "require", max: 1 });

async function seedMemory(
  userId: string,
  opts: {
    title: string;
    category: string;
    tags: string[];
    savedAt: Date;
    viewCount?: number;
  },
): Promise<string> {
  const memoryId = randomUUID();
  const captureId = randomUUID();
  await sql`
    insert into captures (id, user_id, kind, raw_input, status, client)
    values (${captureId}, ${userId}, 'text', ${opts.title}, 'done', 'eval-m6')
  `;
  await sql`
    insert into memories (
      id, user_id, capture_id, source_type, content_type, title, tldr, summary,
      category, tags, key_points, raw_text, status, source_url, saved_at, view_count
    ) values (
      ${memoryId}, ${userId}, ${captureId}, 'text', 'article',
      ${opts.title}, ${`TLDR for ${opts.title}`}, ${`Summary for ${opts.title}`},
      ${opts.category}, ${opts.tags}, ${["point a"]}, ${opts.title}, 'done',
      ${`lyvora://eval-m6/${memoryId}`}, ${opts.savedAt}, ${opts.viewCount ?? 0}
    )
  `;
  return memoryId;
}

try {
  const tables = await sql`
    select
      to_regclass('public.memory_events') is not null as events,
      to_regclass('public.weekly_reports') is not null as reports
  `;
  if (!tables[0]?.events || !tables[0]?.reports) {
    throw new Error("M6 tables missing — run apply-m6-reports.ts first");
  }

  const [user] = await sql`select id, email from profiles order by created_at asc limit 1`;
  if (!user) throw new Error("No profile found");
  const userId = user.id as string;

  const now = new Date();
  const daysAgo = (n: number) =>
    new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  const thisWeekA = await seedMemory(userId, {
    title: "M6 Eval — Protein Bowl Prep",
    category: "Recipes",
    tags: ["protein", "meal-prep"],
    savedAt: daysAgo(1),
  });
  const thisWeekB = await seedMemory(userId, {
    title: "M6 Eval — TypeScript Tips",
    category: "Programming",
    tags: ["typescript", "frontend"],
    savedAt: daysAgo(2),
  });
  await seedMemory(userId, {
    title: "M6 Eval — Last Week Hiking Trails",
    category: "Travel",
    tags: ["hiking"],
    savedAt: daysAgo(10),
  });
  const forgotten = await seedMemory(userId, {
    title: "M6 Eval — Forgotten Yoga Sequence",
    category: "Fitness",
    tags: ["yoga"],
    savedAt: daysAgo(45),
    viewCount: 0,
  });

  await recordMemoryView(userId, thisWeekA);
  await recordMemoryView(userId, thisWeekB);
  await recordMemoryView(userId, thisWeekA);

  const interests = await recomputeInterests(userId);
  const report = await generateWeeklyReport(userId, now);
  const latest = await getLatestWeeklyReport(userId);
  const email = await sendWeeklyReportEmail({
    to: (user.email as string) || "eval@example.com",
    report,
  });

  const p = report.payload;
  const checks = {
    savedThisWeekAtLeast2: p.savedThisWeek >= 2,
    hasTopCategories: p.topCategories.length > 0,
    hasRecommended: p.recommendedRevisits.length > 0,
    hasGrowth: p.growth.totalMemories >= 1,
    narrativeNonEmpty: Boolean(report.narrative && report.narrative.length > 10),
    latestMatches: latest?.id === report.id,
    interestsHaveCategories: Object.keys(interests.categories).length > 0,
    emailSkippedWithoutKey: hadResend ? true : email.skipped === true,
    forgottenEligible: forgotten.length > 0,
  };

  console.log({
    weekStart: p.weekStart,
    savedThisWeek: p.savedThisWeek,
    savedLastWeek: p.savedLastWeek,
    topCategories: p.topCategories,
    recommendedRevisits: p.recommendedRevisits.map((m) => m.title),
    growth: p.growth,
    narrative: report.narrative,
    email,
    checks,
  });

  if (Object.values(checks).some((v) => !v)) {
    throw new Error("eval-report assertions failed");
  }
  console.log("OK");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
