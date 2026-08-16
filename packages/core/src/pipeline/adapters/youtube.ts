import { fetchTranscript } from "youtube-transcript";
import type { CaptureSource, RawFetchResult, SourceAdapter } from "../types";
import {
  canonicalYoutubeUrl,
  extractYoutubeVideoId,
  isYoutubeUrl,
} from "../youtube-url";

function asText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object" && "text" in value) {
    const text = (value as { text?: unknown }).text;
    if (typeof text === "string" && text.trim()) return text.trim();
  }
  return null;
}

async function fetchMetadata(videoId: string): Promise<{
  title: string;
  channel: string | null;
  description: string;
  thumb: string;
}> {
  const { Innertube } = await import("youtubei.js");
  const yt = await Innertube.create({ retrieve_player: false });
  const info = await yt.getBasicInfo(videoId);
  const basic = info.basic_info;

  return {
    title: asText(basic.title) ?? `YouTube ${videoId}`,
    channel: asText(basic.author),
    description: asText(basic.short_description) ?? "",
    thumb:
      basic.thumbnail?.[0]?.url ??
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  };
}

async function fetchCaptions(videoId: string): Promise<string> {
  try {
    const rows = await fetchTranscript(videoId);
    return rows
      .map((row) => row.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return "";
  }
}

export const youtubeAdapter: SourceAdapter = {
  id: "youtube",
  priority: 10,
  matches(source: CaptureSource) {
    return (
      source.kind === "url" &&
      Boolean(source.rawInput && isYoutubeUrl(source.rawInput))
    );
  },
  async fetch(source: CaptureSource): Promise<RawFetchResult> {
    const input = source.canonicalUrl ?? source.rawInput;
    if (!input) throw new Error("youtubeAdapter requires a URL");

    const videoId = extractYoutubeVideoId(input);
    if (!videoId) throw new Error("Could not parse YouTube video id");

    const [meta, transcript] = await Promise.all([
      fetchMetadata(videoId),
      fetchCaptions(videoId),
    ]);

    const parts = [
      `Title: ${meta.title}`,
      meta.channel ? `Channel: ${meta.channel}` : null,
      meta.description ? `Description:\n${meta.description}` : null,
      transcript
        ? `Transcript:\n${transcript}`
        : "Transcript: (not available for this video)",
    ].filter(Boolean);

    return {
      adapterId: "youtube",
      finalUrl: canonicalYoutubeUrl(videoId),
      contentType: "text",
      text: parts.join("\n\n"),
      title: meta.title,
      siteName: "YouTube",
      author: meta.channel,
      heroImageUrl: meta.thumb,
      publishedAt: null,
    };
  },
};
