/**
 * M3 golden-set: PRD §20 example queries must return the expected memory in top 3.
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import { chunkAndEmbed } from "../src/pipeline/chunk-and-embed.ts";
import { searchFull } from "../src/search/search-memories.ts";

const envPath = resolve(import.meta.dirname, "../../../apps/web/.env.local");
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  process.env[trimmed.slice(0, eq)] ??= trimmed.slice(eq + 1);
}

const sql = postgres(process.env.SUPABASE_DB_URL!, { ssl: "require", max: 1 });

const GOLDEN = [
  {
    key: "protein-no-eggs",
    query: "The protein recipe without eggs.",
    title: "High-Protein Overnight Oats Without Eggs",
    tldr: "Egg-free protein breakfast with Greek yogurt, whey, and oats.",
    summary:
      "A high protein recipe that uses no eggs. Overnight oats with Greek yogurt, whey protein, chia seeds, and almond milk. Perfect vegetarian protein breakfast.",
    category: "Recipes",
    tags: ["protein", "breakfast", "egg-free", "oats"],
    keyPoints: [
      "No eggs required",
      "Uses whey and Greek yogurt for protein",
      "Prep the night before",
    ],
    contentType: "recipe",
    rawText:
      "Egg-free high protein overnight oats recipe. Ingredients: oats, Greek yogurt, whey protein powder, chia, almond milk. No eggs.",
  },
  {
    key: "dev-backpack",
    query: "The backpack recommended by developers.",
    title: "AER Travel Pack 3 — Developer Favorite Backpack",
    tldr: "The tech backpack engineers recommend for commuting and travel.",
    summary:
      "Developers and software engineers frequently recommend the AER Travel Pack 3 for its laptop sleeve, organization, and durable build.",
    category: "Shopping",
    tags: ["backpack", "developers", "tech", "commute"],
    keyPoints: [
      "Popular among developers",
      "Fits 16-inch laptop",
      "Clamshell opening",
    ],
    contentType: "product",
    rawText:
      "Backpack recommended by developers: AER Travel Pack 3. Great for engineers who carry a laptop and chargers.",
  },
  {
    key: "react-hooks",
    query: "The React article explaining hooks.",
    title: "A Complete Guide to React Hooks",
    tldr: "Explains useState, useEffect, and custom hooks with examples.",
    summary:
      "React article explaining hooks: useState for state, useEffect for side effects, and how to write custom hooks. Clear examples for beginners.",
    category: "Programming",
    tags: ["react", "hooks", "javascript", "frontend"],
    keyPoints: [
      "Explains React hooks",
      "useState and useEffect covered",
      "Custom hooks section",
    ],
    contentType: "article",
    rawText:
      "This React article explaining hooks walks through useState, useEffect, useMemo, and writing your own hooks.",
  },
  {
    key: "switzerland-reel",
    query: "The travel reel about Switzerland.",
    title: "Switzerland Alps Travel Reel — Interlaken to Zermatt",
    tldr: "A short travel reel covering Swiss Alps highlights and train tips.",
    summary:
      "Travel reel about Switzerland showing Interlaken, Jungfrau, and Zermatt with scenic train tips and when to visit the Alps.",
    category: "Travel",
    tags: ["switzerland", "alps", "travel", "reel"],
    keyPoints: [
      "Switzerland travel reel",
      "Interlaken and Zermatt",
      "Swiss travel pass tip",
    ],
    contentType: "video",
    rawText:
      "Instagram travel reel about Switzerland: Alps, Interlaken, Zermatt, chocolate, and scenic trains.",
  },
] as const;

try {
  const [user] = await sql`select id from profiles order by created_at asc limit 1`;
  if (!user) throw new Error("No profile found");
  const userId = user.id as string;

  const expectedIds: Record<string, string> = {};

  for (const item of GOLDEN) {
    const memoryId = randomUUID();
    const captureId = randomUUID();
    await sql`
      insert into captures (id, user_id, kind, raw_input, status, client)
      values (${captureId}, ${userId}, 'text', ${item.rawText}, 'done', 'eval-m3')
    `;
    await sql`
      insert into memories (
        id, user_id, capture_id, source_type, content_type, title, tldr, summary,
        category, tags, key_points, raw_text, status, source_url
      ) values (
        ${memoryId}, ${userId}, ${captureId}, 'text', ${item.contentType},
        ${item.title}, ${item.tldr}, ${item.summary}, ${item.category},
        ${item.tags}, ${item.keyPoints}, ${item.rawText}, 'done',
        ${`lyvora://eval/${item.key}`}
      )
    `;
    await chunkAndEmbed(memoryId, userId);
    expectedIds[item.key] = memoryId;
    console.log("seeded", item.key, memoryId);
  }

  let pass = 0;
  let mrr = 0;
  let recall5 = 0;

  for (const item of GOLDEN) {
    const expected = expectedIds[item.key]!;
    const result = await searchFull(userId, item.query, {}, 5);
    const ids = result.hits.map((hit) => hit.id);
    const rank = ids.indexOf(expected);
    const inTop3 = rank >= 0 && rank < 3;
    const inTop5 = rank >= 0 && rank < 5;
    if (inTop3) pass += 1;
    if (inTop5) {
      recall5 += 1;
      mrr += 1 / (rank + 1);
    }
    console.log({
      query: item.query,
      expected,
      rank: rank === -1 ? null : rank + 1,
      top3: inTop3,
      top: result.hits.slice(0, 3).map((hit) => hit.title),
    });
  }

  const n = GOLDEN.length;
  console.log({
    top3Pass: `${pass}/${n}`,
    recallAt5: recall5 / n,
    mrr: mrr / n,
  });

  if (pass < n) {
    throw new Error(`Eval failed: only ${pass}/${n} queries hit top 3`);
  }
  console.log("OK");
} finally {
  await sql.end({ timeout: 5 });
}
