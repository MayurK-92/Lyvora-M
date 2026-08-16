import {
  MAX_VIDEO_BYTES,
  describeImage,
  describeVideo,
} from "../../ai/describe-video";
import type { CaptureSource, RawFetchResult, SourceAdapter } from "../types";
import {
  canonicalInstagramUrl,
  extractInstagramShortcode,
  isInstagramUrl,
} from "../instagram-url";

/**
 * Instagram serves full OpenGraph tags (caption, creator, media) to link-preview
 * crawlers while walling off browser UAs. facebookexternalhit is the most
 * reliably allowed one.
 */
const CRAWLER_UA =
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";

function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCodePoint(parseInt(dec, 10)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function ogTag(html: string, prop: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property="${prop}"[^>]+content="([^"]*)"`, "i"),
    new RegExp(`<meta[^>]+content="([^"]*)"[^>]+property="${prop}"`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeEntities(match[1]);
  }
  return null;
}

interface ReelMeta {
  title: string | null;
  /** og:description — "N likes, N comments - user on date: "caption..."" */
  description: string | null;
  caption: string | null;
  username: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
}

function parseOg(html: string): ReelMeta {
  const title = ogTag(html, "og:title");
  const description = ogTag(html, "og:description");

  // og:title shape: `Name (@user) on Instagram: "..."` or `Name on Instagram: "..."`.
  const username =
    title?.match(/\(@([\w.]+)\)/)?.[1] ??
    description?.match(/comments? - ([\w.]+) on /)?.[1] ??
    null;

  // Caption is the quoted tail of og:description / og:title. Instagram often
  // truncates without a closing quote, so the closing quote is optional.
  const caption =
    description?.match(/: "([\s\S]*?)"?\s*$/)?.[1]?.replace(/"$/, "") ??
    title?.match(/: "([\s\S]*?)"?\s*$/)?.[1]?.replace(/"$/, "") ??
    null;

  return {
    title,
    description,
    caption,
    username,
    videoUrl:
      ogTag(html, "og:video") ??
      ogTag(html, "og:video:url") ??
      ogTag(html, "og:video:secure_url"),
    imageUrl: ogTag(html, "og:image"),
  };
}

async function fetchReelPage(shortcode: string): Promise<ReelMeta> {
  // Prefer /reel/ then /p/ — both usually resolve for Reels.
  const urls = [
    `https://www.instagram.com/reel/${shortcode}/`,
    `https://www.instagram.com/p/${shortcode}/`,
  ];

  let lastError: Error | null = null;
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": CRAWLER_UA,
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(25_000),
      });
      if (!response.ok) {
        lastError = new Error(`Instagram fetch failed (${response.status})`);
        continue;
      }
      const meta = parseOg(await response.text());
      if (meta.caption || meta.description || meta.imageUrl || meta.videoUrl) {
        return meta;
      }
      lastError = new Error("Instagram returned empty OpenGraph tags");
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error("Instagram fetch failed");
}

async function downloadMedia(
  url: string,
  maxBytes: number,
): Promise<Uint8Array | null> {
  const response = await fetch(url, {
    headers: { "User-Agent": CRAWLER_UA, Referer: "https://www.instagram.com/" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) return null;

  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > maxBytes) return null;

  const bytes = new Uint8Array(await response.arrayBuffer());
  return bytes.byteLength <= maxBytes ? bytes : null;
}

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

export const instagramAdapter: SourceAdapter = {
  id: "instagram",
  priority: 10,
  matches(source: CaptureSource) {
    return (
      source.kind === "url" &&
      Boolean(source.rawInput && isInstagramUrl(source.rawInput))
    );
  },
  async fetch(source: CaptureSource): Promise<RawFetchResult> {
    const input = source.canonicalUrl ?? source.rawInput;
    if (!input) throw new Error("instagramAdapter requires a URL");

    const shortcode = extractInstagramShortcode(input);
    if (!shortcode) throw new Error("Could not parse Instagram shortcode");

    const meta = await fetchReelPage(shortcode);

    if (!meta.caption && !meta.description && !meta.videoUrl && !meta.imageUrl) {
      throw new Error(
        "Instagram returned no data for this reel (it may be private or blocked)",
      );
    }

    // "AI watches the reel" when video is available. Skip cover-image Gemini
    // calls when we already have a caption — saves free-tier quota.
    let mediaReport = "";
    let mediaReportKind: "video" | "image" | null = null;
    try {
      if (meta.videoUrl) {
        const video = await downloadMedia(meta.videoUrl, MAX_VIDEO_BYTES);
        if (video) {
          mediaReport = await describeVideo(video);
          mediaReportKind = "video";
        }
      }
      if (!mediaReport && !meta.caption && meta.imageUrl) {
        const image = await downloadMedia(meta.imageUrl, MAX_IMAGE_BYTES);
        if (image) {
          mediaReport = await describeImage(image);
          mediaReportKind = "image";
        }
      }
    } catch (error) {
      // Media analysis is best-effort; caption still makes a useful memory.
      console.warn(
        "[instagram] media analysis failed:",
        error instanceof Error ? error.message : error,
      );
    }

    const parts = [
      meta.username ? `Creator: @${meta.username}` : null,
      meta.caption
        ? `Caption:\n${meta.caption}`
        : meta.description
          ? `Post info:\n${meta.description}`
          : null,
      mediaReport
        ? mediaReportKind === "video"
          ? `Video content (AI-watched):\n${mediaReport}`
          : `Cover image (AI-described):\n${mediaReport}`
        : null,
    ].filter(Boolean);

    if (parts.length === 0) {
      throw new Error("Could not extract any content from this reel");
    }

    return {
      adapterId: "instagram",
      finalUrl: canonicalInstagramUrl(shortcode),
      contentType: "text",
      text: parts.join("\n\n"),
      title:
        meta.caption?.split("\n")[0]?.slice(0, 120) ??
        meta.title ??
        `Instagram Reel by @${meta.username ?? "unknown"}`,
      siteName: "Instagram",
      author: meta.username ? `@${meta.username}` : null,
      heroImageUrl: meta.imageUrl,
      publishedAt: null,
    };
  },
};
