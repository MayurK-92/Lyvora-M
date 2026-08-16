import { describeImage } from "../../ai/describe-video";
import { downloadCaptureObject } from "../../storage/captures";
import type { CaptureSource, RawFetchResult, SourceAdapter } from "../types";

export const imageAdapter: SourceAdapter = {
  id: "image",
  priority: 20,
  matches(source: CaptureSource) {
    return source.kind === "image" && Boolean(source.uploadPath);
  },
  async fetch(source: CaptureSource): Promise<RawFetchResult> {
    if (!source.uploadPath) {
      throw new Error("imageAdapter requires uploadPath");
    }

    const { bytes, contentType } = await downloadCaptureObject(
      source.userId,
      source.uploadPath,
    );

    const report = await describeImage(bytes, contentType ?? undefined);
    if (!report.trim()) {
      throw new Error("Could not analyze image");
    }

    const titleMatch = report.match(/Text:\s*([^\n]+)/i);
    const title =
      titleMatch?.[1]?.trim().slice(0, 120) ||
      report.split(/\r?\n/).find((line) => line.trim())?.slice(0, 120) ||
      "Image";

    return {
      adapterId: "image",
      finalUrl: `lyvora://image/${source.captureId}`,
      contentType: "image",
      text: report,
      title,
      siteName: "Image",
      author: null,
      heroImageUrl: null,
      publishedAt: null,
    };
  },
};
