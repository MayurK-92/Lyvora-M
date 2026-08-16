import { z } from "zod";
import { CATEGORY_TAXONOMY } from "./categories";
import { StructuredPayload, coerceStructured } from "./structured";

export const CONTENT_TYPES = [
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
] as const;

export const ENTITY_KINDS = [
  "person",
  "org",
  "product",
  "place",
  "concept",
  "other",
] as const;

export const KnowledgeExtraction = z.object({
  title: z.string().max(140),
  contentType: z.enum(CONTENT_TYPES),
  tldr: z.string().max(180),
  summary: z.string(),
  keyPoints: z.array(z.string()).max(8),
  category: z.enum(CATEGORY_TAXONOMY),
  tags: z.array(z.string()).max(10),
  language: z.string(),
  entities: z
    .array(
      z.object({
        name: z.string(),
        kind: z.enum(ENTITY_KINDS),
        salience: z.number().min(0).max(1),
      }),
    )
    .max(20),
  structured: z.preprocess((value) => {
    const coerced = coerceStructured(value);
    const parsed = StructuredPayload.safeParse(coerced);
    if (parsed.success) return parsed.data;
    return { kind: "generic", facts: [], actionItems: [] };
  }, StructuredPayload),
  confidence: z.number().min(0).max(1),
});

export type KnowledgeExtraction = z.infer<typeof KnowledgeExtraction>;
