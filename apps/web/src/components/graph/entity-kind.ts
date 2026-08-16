import type { IconName } from "@lyvora/ui";

export interface EntityKindStyle {
  icon: IconName;
  label: string;
}

const KIND_STYLES: Record<string, EntityKindStyle> = {
  person: { icon: "person", label: "Person" },
  company: { icon: "business_center", label: "Company" },
  product: { icon: "devices", label: "Product" },
  technology: { icon: "terminal", label: "Technology" },
  ingredient: { icon: "restaurant", label: "Ingredient" },
  place: { icon: "public", label: "Place" },
  book: { icon: "book", label: "Book" },
  movie: { icon: "movie", label: "Movie" },
  topic: { icon: "lightbulb", label: "Topic" },
  exercise: { icon: "fitness_center", label: "Exercise" },
  other: { icon: "category", label: "Other" },
};

const FALLBACK = KIND_STYLES.other!;

export function getEntityKindStyle(kind: string | null | undefined): EntityKindStyle {
  if (!kind) return FALLBACK;
  return KIND_STYLES[kind] ?? FALLBACK;
}

/** Compact legend entries shown under the canvas. */
export const LEGEND_KINDS: Array<{ kind: string; style: EntityKindStyle }> = [
  "person",
  "technology",
  "topic",
  "product",
  "company",
].map((kind) => ({ kind, style: KIND_STYLES[kind]! }));
