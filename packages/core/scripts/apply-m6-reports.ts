import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

const envPath = resolve(import.meta.dirname, "../../../apps/web/.env.local");
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  process.env[trimmed.slice(0, eq)] ??= trimmed.slice(eq + 1);
}

const sqlPath = resolve(
  import.meta.dirname,
  "../../../supabase/migrations/0008_reports_m6.sql",
);
const migration = readFileSync(sqlPath, "utf8");
const sql = postgres(process.env.SUPABASE_DB_URL!, { ssl: "require", max: 1 });

try {
  await sql.unsafe(migration);
  const [{ events }] = await sql`
    select to_regclass('public.memory_events') is not null as events
  `;
  const [{ reports }] = await sql`
    select to_regclass('public.weekly_reports') is not null as reports
  `;
  console.log({ memory_events: events, weekly_reports: reports });
  console.log("OK");
} finally {
  await sql.end({ timeout: 5 });
}
