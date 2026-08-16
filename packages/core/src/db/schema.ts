import {
  bigserial,
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  unique,
  uuid,
  customType,
} from "drizzle-orm/pg-core";

// Mirrors supabase/migrations/0001_init.sql + 0002_captures_memories.sql.

const vector1536 = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(1536)";
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: unknown): number[] {
    if (Array.isArray(value)) return value.map(Number);
    if (typeof value === "string") {
      const trimmed = value.replace(/^\[/, "").replace(/\]$/, "");
      if (!trimmed) return [];
      return trimmed.split(",").map((part) => Number(part.trim()));
    }
    return [];
  },
});

export const captureKindEnum = pgEnum("capture_kind", ["url", "text", "pdf", "image"]);

export const captureStatusEnum = pgEnum("capture_status", [
  "queued",
  "fetching",
  "extracting",
  "enriching",
  "embedding",
  "done",
  "failed",
  "duplicate",
]);

export const sourceTypeEnum = pgEnum("source_type", [
  "web",
  "text",
  "pdf",
  "image",
  "youtube",
  "instagram",
  "reddit",
  "x",
  "linkedin",
  "github",
  "amazon",
  "medium",
  "notion",
  "gmail",
]);

export const contentTypeEnum = pgEnum("content_type", [
  "article",
  "video",
  "product",
  "recipe",
  "workout",
  "place",
  "repository",
  "paper",
  "thread",
  "note",
  "document",
  "image",
  "course",
  "tool",
  "other",
]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  timezone: text("timezone").notNull().default("UTC"),
  interests: jsonb("interests").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const captures = pgTable("captures", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  kind: captureKindEnum("kind").notNull(),
  rawInput: text("raw_input"),
  uploadPath: text("upload_path"),
  userNote: text("user_note"),
  client: text("client"),
  idempotencyKey: text("idempotency_key"),
  status: captureStatusEnum("status").notNull().default("queued"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  memoryId: uuid("memory_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memories = pgTable("memories", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  captureId: uuid("capture_id").references(() => captures.id, { onDelete: "set null" }),

  sourceType: sourceTypeEnum("source_type").notNull(),
  sourceUrl: text("source_url"),
  canonicalUrl: text("canonical_url"),
  urlHash: text("url_hash"),
  siteName: text("site_name"),
  author: text("author"),
  publishedAt: timestamp("published_at", { withTimezone: true }),

  contentType: contentTypeEnum("content_type").notNull().default("other"),
  title: text("title").notNull(),
  tldr: text("tldr"),
  summary: text("summary"),
  category: text("category").notNull().default("Uncategorized"),
  tags: text("tags").array().notNull().default([]),
  language: text("language").default("en"),
  keyPoints: text("key_points").array().notNull().default([]),

  structured: jsonb("structured").notNull().default({}),

  heroImageUrl: text("hero_image_url"),
  storagePath: text("storage_path"),
  rawText: text("raw_text"),

  embedding: vector1536("embedding"),
  embeddingModel: text("embedding_model"),

  aiMeta: jsonb("ai_meta").notNull().default({}),
  status: captureStatusEnum("status").notNull().default("queued"),
  duplicateOf: uuid("duplicate_of"),
  isArchived: boolean("is_archived").notNull().default(false),
  isPinned: boolean("is_pinned").notNull().default(false),
  viewCount: integer("view_count").notNull().default(0),
  lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }),
  savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memoryChunks = pgTable("memory_chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  memoryId: uuid("memory_id")
    .notNull()
    .references(() => memories.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  heading: text("heading"),
  content: text("content").notNull(),
  tokenCount: integer("token_count"),
  embedding: vector1536("embedding"),
});

export const chatThreads = pgTable("chat_threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  title: text("title"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  threadId: uuid("thread_id")
    .notNull()
    .references(() => chatThreads.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: jsonb("content").notNull(),
  citations: uuid("citations").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const entityKindEnum = pgEnum("entity_kind", [
  "person",
  "company",
  "product",
  "technology",
  "ingredient",
  "place",
  "book",
  "movie",
  "topic",
  "exercise",
  "other",
]);

export const edgeKindEnum = pgEnum("edge_kind", [
  "similar",
  "about_same",
  "follow_up",
  "contradicts",
  "duplicate",
  "part_of",
]);

export const entities = pgTable(
  "entities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    kind: entityKindEnum("kind").notNull(),
    name: text("name").notNull(),
    normName: text("norm_name").notNull(),
    aliases: text("aliases").array().notNull().default([]),
    embedding: vector1536("embedding"),
    mentionCount: integer("mention_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.userId, table.kind, table.normName)],
);

export const memoryEntities = pgTable(
  "memory_entities",
  {
    memoryId: uuid("memory_id")
      .notNull()
      .references(() => memories.id, { onDelete: "cascade" }),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    role: text("role"),
    salience: real("salience").notNull().default(0.5),
  },
  (table) => [primaryKey({ columns: [table.memoryId, table.entityId] })],
);

export const memoryEdges = pgTable(
  "memory_edges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    srcId: uuid("src_id")
      .notNull()
      .references(() => memories.id, { onDelete: "cascade" }),
    dstId: uuid("dst_id")
      .notNull()
      .references(() => memories.id, { onDelete: "cascade" }),
    kind: edgeKindEnum("kind").notNull(),
    score: real("score").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.srcId, table.dstId, table.kind)],
);

export const memoryEvents = pgTable("memory_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  memoryId: uuid("memory_id")
    .notNull()
    .references(() => memories.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const weeklyReports = pgTable(
  "weekly_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    weekStart: date("week_start").notNull(),
    payload: jsonb("payload").notNull(),
    narrative: text("narrative"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.userId, table.weekStart)],
);

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Capture = typeof captures.$inferSelect;
export type NewCapture = typeof captures.$inferInsert;
export type Memory = typeof memories.$inferSelect;
export type NewMemory = typeof memories.$inferInsert;
export type MemoryChunk = typeof memoryChunks.$inferSelect;
export type NewMemoryChunk = typeof memoryChunks.$inferInsert;
export type ChatThread = typeof chatThreads.$inferSelect;
export type NewChatThread = typeof chatThreads.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
export type Entity = typeof entities.$inferSelect;
export type NewEntity = typeof entities.$inferInsert;
export type MemoryEntity = typeof memoryEntities.$inferSelect;
export type MemoryEdge = typeof memoryEdges.$inferSelect;
export type NewMemoryEdge = typeof memoryEdges.$inferInsert;
export type MemoryEvent = typeof memoryEvents.$inferSelect;
export type NewMemoryEvent = typeof memoryEvents.$inferInsert;
export type WeeklyReport = typeof weeklyReports.$inferSelect;
export type NewWeeklyReport = typeof weeklyReports.$inferInsert;
