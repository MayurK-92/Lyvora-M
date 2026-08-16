import type { CaptureSource, RawFetchResult, SourceAdapter } from "../types";

export const textAdapter: SourceAdapter = {
  id: "text",
  priority: 20,
  matches(source: CaptureSource) {
    return source.kind === "text" && Boolean(source.rawInput?.trim());
  },
  async fetch(source: CaptureSource): Promise<RawFetchResult> {
    const text = source.rawInput?.trim();
    if (!text) throw new Error("textAdapter requires raw input");

    const title =
      text.split(/\r?\n/).find((line) => line.trim())?.slice(0, 120) ??
      "Untitled note";

    return {
      adapterId: "text",
      finalUrl: `lyvora://text/${source.captureId}`,
      contentType: "text",
      text,
      title,
      siteName: "Note",
      author: null,
      heroImageUrl: null,
      publishedAt: null,
    };
  },
};
