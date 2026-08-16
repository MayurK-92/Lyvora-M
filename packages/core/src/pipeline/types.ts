export interface CaptureSource {
  captureId: string;
  userId: string;
  kind: "url" | "text" | "pdf" | "image";
  rawInput: string | null;
  uploadPath?: string | null;
  userNote: string | null;
  canonicalUrl?: string;
  urlHash?: string;
  adapterId: string;
  duplicateOf?: string;
}

export interface RawFetchResult {
  adapterId: string;
  finalUrl: string;
  contentType: "html" | "text" | "pdf" | "image";
  html?: string;
  text?: string;
  title?: string | null;
  siteName?: string | null;
  author?: string | null;
  heroImageUrl?: string | null;
  publishedAt?: string | null;
}

export interface ExtractedText {
  text: string;
  headings: string[];
  title?: string | null;
  siteName?: string | null;
  author?: string | null;
  heroImageUrl?: string | null;
  publishedAt?: string | null;
  sourceUrl: string;
}

export interface SourceAdapter {
  id: string;
  /** Lower number = higher priority. webAdapter is always-matching fallback (priority 0). */
  priority: number;
  matches(source: CaptureSource): boolean;
  fetch(source: CaptureSource): Promise<RawFetchResult>;
}
