import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import { linkAndDedup } from "../src/graph/link-and-dedup.ts";

const envPath = resolve(import.meta.dirname, "../../../apps/web/.env.local");
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  process.env[trimmed.slice(0, eq)] ??= trimmed.slice(eq + 1);
}

const limit = Number(process.argv[2] ?? "40");
const sql = postgres(process.env.SUPABASE_DB_URL!, { ssl: "require", max: 1 });

try {
  const rows = await sql`
    select id, user_id
    from memories
    where duplicate_of is null
      and not is_archived
    order by saved_at desc
    limit ${limit}
  `;
  let processed = 0;
  const errors: string[] = [];
  for (const row of rows) {
    try {
      await linkAndDedup(row.id as string, row.user_id as string);
      processed += 1;
      console.log("linked", row.id);
    } catch (error) {
      errors.push(
        `${row.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  console.log({ processed, errors });
  if (errors.length) process.exitCode = 1;
  else console.log("OK");
} finally {
  await sql.end({ timeout: 5 });
}
