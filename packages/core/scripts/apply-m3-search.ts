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
  "../../../supabase/migrations/0005_search_m3.sql",
);
const migration = readFileSync(sqlPath, "utf8");
const sql = postgres(process.env.SUPABASE_DB_URL!, { ssl: "require", max: 1 });

try {
  await sql.unsafe(migration);
  const [{ exists }] = await sql`
    select to_regprocedure(
      'search_memories(uuid,text,vector,text[],text[],content_type[],timestamptz,timestamptz,int,float,float,int)'
    ) is not null as exists
  `;
  const [{ chunks }] = await sql`
    select to_regclass('public.memory_chunks') is not null as chunks
  `;
  console.log({ search_memories: exists, memory_chunks: chunks });
  console.log("OK");
} finally {
  await sql.end({ timeout: 5 });
}
