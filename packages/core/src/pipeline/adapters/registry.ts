import type { CaptureSource, SourceAdapter } from "../types";
import { imageAdapter } from "./image";
import { instagramAdapter } from "./instagram";
import { pdfAdapter } from "./pdf";
import { textAdapter } from "./text";
import { webAdapter } from "./web";
import { youtubeAdapter } from "./youtube";

const adapters: SourceAdapter[] = [
  textAdapter,
  pdfAdapter,
  imageAdapter,
  youtubeAdapter,
  instagramAdapter,
  webAdapter,
].sort((a, b) => b.priority - a.priority);

export function resolveAdapter(source: CaptureSource): SourceAdapter {
  const match = adapters.find((adapter) => adapter.matches(source));
  if (!match) {
    throw new Error(`No adapter matched capture ${source.captureId}`);
  }
  return match;
}

export {
  imageAdapter,
  instagramAdapter,
  pdfAdapter,
  textAdapter,
  webAdapter,
  youtubeAdapter,
};
