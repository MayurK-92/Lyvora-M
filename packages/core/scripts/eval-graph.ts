/**
 * M5: product + review share an entity/edge and appear in relatedMemories.
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import { chunkAndEmbed } from "../src/pipeline/chunk-and-embed.ts";
import { linkAndDedup } from "../src/graph/link-and-dedup.ts";
import { relatedMemories } from "../src/graph/queries.ts";

const envPath = resolve(import.meta.dirname, "../../../apps/web/.env.local");
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  process.env[trimmed.slice(0, eq)] ??= trimmed.slice(eq + 1);
}

const sql = postgres(process.env.SUPABASE_DB_URL!, { ssl: "require", max: 1 });

const PRODUCT = {
  title: "Framework Laptop 13 — Modular DIY Laptop",
  tldr: "Buy page for the Framework Laptop 13 modular notebook.",
  summary:
    "The Framework Laptop 13 is a modular DIY laptop you can upgrade and repair. Ports, battery, and motherboard are user-replaceable. Ideal for developers who want a repairable machine.",
  category: "Shopping",
  tags: ["framework", "laptop", "modular", "diy"],
  keyPoints: [
    "Framework Laptop 13 modular design",
    "User-repairable ports and battery",
    "Available in several CPU configs",
  ],
  contentType: "product",
  rawText:
    "Framework Laptop 13 product page. Modular DIY laptop with upgradeable ports, battery, and mainboard. Buy Framework Laptop 13.",
  entities: [
    { name: "Framework Laptop 13", kind: "product", salience: 0.95 },
    { name: "Framework", kind: "company", salience: 0.8 },
  ],
};

const REVIEW = {
  title: "Framework Laptop 13 Review: Repairable and Worth It",
  tldr: "Hands-on review of the Framework Laptop 13 for developers.",
  summary:
    "A detailed review of the Framework Laptop 13 covering build quality, keyboard, repairability, and whether developers should buy it. The Framework Laptop 13 stands out for modular upgrades.",
  category: "Technology",
  tags: ["framework", "laptop", "review", "repairable"],
  keyPoints: [
    "Framework Laptop 13 review",
    "Excellent repairability score",
    "Great for engineers who upgrade parts",
  ],
  contentType: "article",
  rawText:
    "Review of Framework Laptop 13. The Framework Laptop 13 is a repairable modular notebook reviewed for keyboard, battery life, and DIY upgrades.",
  entities: [
    { name: "Framework Laptop 13", kind: "product", salience: 0.92 },
    { name: "Framework", kind: "company", salience: 0.7 },
  ],
};

async function seedMemory(
  userId: string,
  item: typeof PRODUCT,
  key: string,
): Promise<string> {
  const memoryId = randomUUID();
  const captureId = randomUUID();
  await sql`
    insert into captures (id, user_id, kind, raw_input, status, client)
    values (${captureId}, ${userId}, 'text', ${item.rawText}, 'done', 'eval-m5')
  `;
  await sql`
    insert into memories (
      id, user_id, capture_id, source_type, content_type, title, tldr, summary,
      category, tags, key_points, raw_text, status, source_url, ai_meta
    ) values (
      ${memoryId}, ${userId}, ${captureId}, 'text', ${item.contentType},
      ${item.title}, ${item.tldr}, ${item.summary}, ${item.category},
      ${item.tags}, ${item.keyPoints}, ${item.rawText}, 'done',
      ${`lyvora://eval-m5/${key}`},
      ${sql.json({ entities: item.entities })}
    )
  `;
  await chunkAndEmbed(memoryId, userId);
  return memoryId;
}

try {
  const tables = await sql`
    select
      to_regclass('public.entities') is not null as entities,
      to_regclass('public.memory_edges') is not null as edges
  `;
  if (!tables[0]?.entities || !tables[0]?.edges) {
    throw new Error("M5 tables missing — run apply-m5-graph.ts first");
  }

  const [user] = await sql`select id from profiles order by created_at asc limit 1`;
  if (!user) throw new Error("No profile found");
  const userId = user.id as string;

  const productId = await seedMemory(userId, PRODUCT, "framework-product");
  const reviewId = await seedMemory(userId, REVIEW, "framework-review");

  await linkAndDedup(productId, userId);
  await linkAndDedup(reviewId, userId);

  const shared = await sql`
    select e.id, e.name, e.kind
    from entities e
    join memory_entities me1 on me1.entity_id = e.id and me1.memory_id = ${productId}::uuid
    join memory_entities me2 on me2.entity_id = e.id and me2.memory_id = ${reviewId}::uuid
    where e.user_id = ${userId}::uuid
  `;

  const edges = await sql`
    select kind, score, reason
    from memory_edges
    where user_id = ${userId}::uuid
      and (
        (src_id = ${productId}::uuid and dst_id = ${reviewId}::uuid)
        or (src_id = ${reviewId}::uuid and dst_id = ${productId}::uuid)
      )
  `;

  const relatedFromProduct = await relatedMemories(userId, productId);
  const relatedFromReview = await relatedMemories(userId, reviewId);

  const hasSharedEntity = shared.some(
    (row) =>
      String(row.name).toLowerCase().includes("framework") &&
      (row.kind === "product" || row.kind === "company"),
  );
  const hasEdge = edges.some(
    (row) => row.kind === "about_same" || row.kind === "similar",
  );
  const productSeesReview = relatedFromProduct.some((m) => m.id === reviewId);
  const reviewSeesProduct = relatedFromReview.some((m) => m.id === productId);

  console.log({
    productId,
    reviewId,
    sharedEntities: shared,
    edges,
    relatedFromProduct: relatedFromProduct.map((m) => ({
      id: m.id,
      relation: m.relation,
    })),
    relatedFromReview: relatedFromReview.map((m) => ({
      id: m.id,
      relation: m.relation,
    })),
    checks: {
      hasSharedEntity,
      hasEdge,
      productSeesReview,
      reviewSeesProduct,
    },
  });

  if (!hasSharedEntity || !hasEdge || !productSeesReview || !reviewSeesProduct) {
    throw new Error("eval-graph assertions failed");
  }
  console.log("OK");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
