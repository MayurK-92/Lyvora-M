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
  "../../../supabase/migrations/0007_graph_m5.sql",
);
const migration = readFileSync(sqlPath, "utf8");
const sql = postgres(process.env.SUPABASE_DB_URL!, { ssl: "require", max: 1 });

try {
  await sql.unsafe(migration);
  const [{ entities }] = await sql`
    select to_regclass('public.entities') is not null as entities
  `;
  const [{ edges }] = await sql`
    select to_regclass('public.memory_edges') is not null as edges
  `;
  console.log({ entities, memory_edges: edges });
  console.log("OK");
} finally {
  await sql.end({ timeout: 5 });
}
