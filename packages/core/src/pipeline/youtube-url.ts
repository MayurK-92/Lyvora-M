const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
]);

function isVideoId(value: string | null | undefined): value is string {
  return Boolean(value && /^[\w-]{11}$/.test(value));
}

/** Extract an 11-char YouTube video id from common URL shapes. */
export function extractYoutubeVideoId(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!YOUTUBE_HOSTS.has(host) && !host.endsWith(".youtube.com")) {
    return null;
  }

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return isVideoId(id) ? id : null;
  }

  const v = url.searchParams.get("v");
  if (isVideoId(v)) return v;

  const parts = url.pathname.split("/").filter(Boolean);
  if (
    parts.length >= 2 &&
    ["shorts", "embed", "live", "v"].includes(parts[0]!.toLowerCase()) &&
    isVideoId(parts[1])
  ) {
    return parts[1]!;
  }

  return null;
}

export function isYoutubeUrl(raw: string): boolean {
  return extractYoutubeVideoId(raw) !== null;
}

/** Stable watch URL used for hashing / dedup. */
export function canonicalYoutubeUrl(videoId: string): string {
  return `https://youtube.com/watch?v=${videoId}`;
}
