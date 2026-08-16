export type DbEntityKind =
  | "person"
  | "company"
  | "product"
  | "technology"
  | "ingredient"
  | "place"
  | "book"
  | "movie"
  | "topic"
  | "exercise"
  | "other";

/** lower + strip diacritics + collapse whitespace (JS stand-in for unaccent). */
export function normName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function mapExtractionKindToDb(kind: string): DbEntityKind {
  switch (kind) {
    case "org":
      return "company";
    case "concept":
      return "topic";
    case "person":
    case "product":
    case "place":
    case "other":
    case "company":
    case "technology":
    case "ingredient":
    case "book":
    case "movie":
    case "topic":
    case "exercise":
      return kind;
    default:
      return "other";
  }
}

export interface ExtractedEntityInput {
  name: string;
  kind: string;
  salience: number;
}
