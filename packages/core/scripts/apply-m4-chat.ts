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
  "../../../supabase/migrations/0006_chat_m4.sql",
);
const migration = readFileSync(sqlPath, "utf8");
const sql = postgres(process.env.SUPABASE_DB_URL!, { ssl: "require", max: 1 });

try {
  await sql.unsafe(migration);
  const [{ threads }] = await sql`
    select to_regclass('public.chat_threads') is not null as threads
  `;
  const [{ messages }] = await sql`
    select to_regclass('public.chat_messages') is not null as messages
  `;
  console.log({ chat_threads: threads, chat_messages: messages });
  console.log("OK");
} finally {
  await sql.end({ timeout: 5 });
}
