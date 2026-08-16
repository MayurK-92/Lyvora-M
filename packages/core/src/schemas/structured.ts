import { z } from "zod";

export const RecipePayload = z.object({
  kind: z.literal("recipe"),
  servings: z.number().int().positive().nullable().default(null),
  totalMinutes: z.number().int().positive().nullable().default(null),
  cuisine: z.string().nullable().default(null),
  difficulty: z.enum(["easy", "medium", "hard"]).nullable().default(null),
  ingredients: z
    .array(
      z.object({
        item: z.string(),
        quantity: z.string().nullable().default(null),
        optional: z.boolean().default(false),
      }),
    )
    .default([]),
  steps: z.array(z.string()).default([]),
  dietaryTags: z.array(z.string()).default([]),
  nutrition: z.record(z.string(), z.string()).nullable().default(null),
});

export const ProductPayload = z.object({
  kind: z.literal("product"),
  productName: z.string(),
  brand: z.string().nullable().default(null),
  price: z
    .object({ amount: z.number(), currency: z.string() })
    .nullable()
    .default(null),
  rating: z.number().min(0).max(5).nullable().default(null),
  features: z.array(z.string()).default([]),
  specs: z.record(z.string(), z.string()).default({}),
  pros: z.array(z.string()).default([]),
  cons: z.array(z.string()).default([]),
  useCases: z.array(z.string()).default([]),
});

export const WorkoutPayload = z.object({
  kind: z.literal("workout"),
  exercises: z
    .array(
      z.object({
        name: z.string(),
        targetMuscles: z.array(z.string()).default([]),
        equipment: z.array(z.string()).default([]),
        sets: z.string().nullable().default(null),
        difficulty: z
          .enum(["beginner", "intermediate", "advanced"])
          .nullable()
          .default(null),
      }),
    )
    .default([]),
  benefits: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  frequency: z.string().nullable().default(null),
});

export const TravelPayload = z.object({
  kind: z.literal("travel"),
  destinations: z.array(z.string()).default([]),
  attractions: z.array(z.string()).default([]),
  hotels: z.array(z.string()).default([]),
  restaurants: z.array(z.string()).default([]),
  bestSeason: z.string().nullable().default(null),
  budget: z.string().nullable().default(null),
  tips: z.array(z.string()).default([]),
});

export const TechPayload = z.object({
  kind: z.literal("tech"),
  technologies: z.array(z.string()).default([]),
  concepts: z.array(z.string()).default([]),
  apis: z.array(z.string()).default([]),
  libraries: z.array(z.string()).default([]),
  bestPractices: z.array(z.string()).default([]),
  codeSnippets: z
    .array(
      z.object({
        language: z.string(),
        code: z.string(),
        note: z.string().nullable().default(null),
      }),
    )
    .default([]),
});

export const GenericPayload = z.object({
  kind: z.literal("generic"),
  facts: z.array(z.string()).default([]),
  actionItems: z.array(z.string()).default([]),
});

export const StructuredPayload = z.discriminatedUnion("kind", [
  RecipePayload,
  ProductPayload,
  WorkoutPayload,
  TravelPayload,
  TechPayload,
  GenericPayload,
]);

export type StructuredPayload = z.infer<typeof StructuredPayload>;

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "item" in item) {
        return String((item as { item: unknown }).item);
      }
      return null;
    })
    .filter((item): item is string => Boolean(item));
}

function asStringRecord(value: unknown): Record<string, string> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const out: Record<string, string> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (entry == null) continue;
      out[key] = typeof entry === "string" ? entry : JSON.stringify(entry);
    }
    return out;
  }
  if (Array.isArray(value)) {
    const out: Record<string, string> = {};
    value.forEach((entry, index) => {
      if (typeof entry === "string") out[`spec_${index + 1}`] = entry;
      else if (entry && typeof entry === "object") {
        const record = entry as Record<string, unknown>;
        const key = String(record.key ?? record.name ?? `spec_${index + 1}`);
        const val = record.value ?? record.val ?? record.spec ?? entry;
        out[key] = typeof val === "string" ? val : JSON.stringify(val);
      }
    });
    return out;
  }
  return {};
}

/**
 * Gemini often invents near-miss field names for structured payloads
 * (`name` vs `productName`, array specs, etc.). Coerce the common cases;
 * fall back to generic so extraction never hard-fails.
 */
export function coerceStructured(value: unknown): unknown {
  if (
    value == null ||
    (typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value as object).length === 0)
  ) {
    return { kind: "generic", facts: [], actionItems: [] };
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    return { kind: "generic", facts: [], actionItems: [] };
  }

  const raw = value as Record<string, unknown>;
  const kind = typeof raw.kind === "string" ? raw.kind : "generic";

  if (kind === "product") {
    const productName =
      (typeof raw.productName === "string" && raw.productName) ||
      (typeof raw.name === "string" && raw.name) ||
      (typeof raw.title === "string" && raw.title) ||
      "Unknown product";

    const features = [
      ...asStringArray(raw.features),
      ...asStringArray(raw.specifications),
    ];
    const specs = {
      ...asStringRecord(raw.specs),
      ...asStringRecord(raw.specifications),
      ...(typeof raw.color === "string" ? { color: raw.color } : {}),
    };

    return {
      kind: "product",
      productName,
      brand: typeof raw.brand === "string" ? raw.brand : null,
      price:
        raw.price && typeof raw.price === "object"
          ? raw.price
          : typeof raw.price === "number"
            ? { amount: raw.price, currency: "USD" }
            : null,
      rating: typeof raw.rating === "number" ? raw.rating : null,
      features,
      specs,
      pros: asStringArray(raw.pros),
      cons: asStringArray(raw.cons),
      useCases: asStringArray(raw.useCases),
    };
  }

  if (kind === "generic") {
    return {
      kind: "generic",
      facts: asStringArray(raw.facts),
      actionItems: asStringArray(raw.actionItems ?? raw.actions),
    };
  }

  // Keep other kinds as-is; Zod defaults fill missing optional fields.
  // If Zod still rejects them, the outer catch converts to generic.
  return raw;
}
