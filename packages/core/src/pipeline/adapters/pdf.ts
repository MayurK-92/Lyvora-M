import { extractText, getDocumentProxy } from "unpdf";
import { describePdf } from "../../ai/describe-video";
import { downloadCaptureObject } from "../../storage/captures";
import type { CaptureSource, RawFetchResult, SourceAdapter } from "../types";

const MIN_TEXT_CHARS = 200;

/** pdf.js (via unpdf) may call Math.sumPrecise on newer builds. */
function ensureMathSumPrecise() {
  const math = Math as Math & { sumPrecise?: (...values: number[]) => number };
  if (typeof math.sumPrecise !== "function") {
    math.sumPrecise = (...values: number[]) =>
      values.reduce((sum, value) => sum + value, 0);
  }
}

export const pdfAdapter: SourceAdapter = {
  id: "pdf",
  priority: 20,
  matches(source: CaptureSource) {
    return source.kind === "pdf" && Boolean(source.uploadPath);
  },
  async fetch(source: CaptureSource): Promise<RawFetchResult> {
    if (!source.uploadPath) {
      throw new Error("pdfAdapter requires uploadPath");
    }

    const { bytes } = await downloadCaptureObject(
      source.userId,
      source.uploadPath,
    );

    ensureMathSumPrecise();

    // unpdf/pdf.js may detach ArrayBuffers — always operate on copies.
    const original = bytes.slice();

    let text = "";
    try {
      const pdf = await getDocumentProxy(original.slice());
      const extracted = await extractText(pdf, { mergePages: true });
      text = (extracted.text ?? "").replace(/\s+/g, " ").trim();
    } catch {
      text = "";
    }

    if (text.length < MIN_TEXT_CHARS) {
      try {
        const vision = await describePdf(original.slice());
        text = [text, vision].filter(Boolean).join("\n\n").trim();
      } catch (error) {
        // Keep selectable text when OCR/render fails (e.g. short digital PDFs).
        if (!text) {
          throw error instanceof Error
            ? error
            : new Error("Could not extract text from PDF");
        }
      }
    }

    if (!text) {
      throw new Error("Could not extract text from PDF");
    }

    const firstLine =
      text.split(/\r?\n/).find((line) => line.trim())?.slice(0, 120) ?? null;

    return {
      adapterId: "pdf",
      finalUrl: `lyvora://pdf/${source.captureId}`,
      contentType: "pdf",
      text,
      title: firstLine ?? "PDF document",
      siteName: "PDF",
      author: null,
      heroImageUrl: null,
      publishedAt: null,
    };
  },
};
