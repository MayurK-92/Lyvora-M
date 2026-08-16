import { createHash } from "node:crypto";
import {
  canonicalInstagramUrl,
  extractInstagramShortcode,
} from "./instagram-url";
import {
  canonicalYoutubeUrl,
  extractYoutubeVideoId,
} from "./youtube-url";

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_src",
]);

/** Canonicalize URL per system_design.md §6.2 resolve-source. */
export function canonicalizeUrl(raw: string): string {
  const youtubeId = extractYoutubeVideoId(raw);
  if (youtubeId) {
    return canonicalYoutubeUrl(youtubeId);
  }

  const instagramShortcode = extractInstagramShortcode(raw);
  if (instagramShortcode) {
    return canonicalInstagramUrl(instagramShortcode);
  }

  const url = new URL(raw.trim());
  url.hash = "";
  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");

  const kept = [...url.searchParams.entries()].filter(
    ([key]) => !TRACKING_PARAMS.has(key.toLowerCase()),
  );
  kept.sort(([a], [b]) => a.localeCompare(b));
  url.search = "";
  for (const [key, value] of kept) {
    url.searchParams.append(key, value);
  }

  let path = url.pathname.replace(/\/+$/, "");
  if (path === "") path = "/";
  url.pathname = path;

  return url.toString();
}

export function hashUrl(canonicalUrl: string): string {
  return createHash("sha256").update(canonicalUrl).digest("hex");
}
