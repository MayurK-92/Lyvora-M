import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { backfillEmbeddings } from "../src/pipeline/chunk-and-embed.ts";

const envPath = resolve(import.meta.dirname, "../../../apps/web/.env.local");
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  process.env[trimmed.slice(0, eq)] ??= trimmed.slice(eq + 1);
}

const limit = Number(process.argv[2] ?? "50");
const result = await backfillEmbeddings({ limit, force: false });
console.log(result);
if (result.errors.length) {
  process.exitCode = 1;
} else {
  console.log("OK");
}
