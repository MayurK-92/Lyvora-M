const INSTAGRAM_HOSTS = new Set(["instagram.com", "m.instagram.com"]);

/** Reel/post shortcodes are base64ish, typically 11 chars but can vary. */
function isShortcode(value: string | null | undefined): value is string {
  return Boolean(value && /^[\w-]{5,20}$/.test(value));
}

/**
 * Extract a shortcode from common Instagram URL shapes:
 * - /reel/{code}, /reels/{code}, /p/{code}, /tv/{code}
 * - /{username}/reel/{code}, /{username}/p/{code}
 */
export function extractInstagramShortcode(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!INSTAGRAM_HOSTS.has(host) && !host.endsWith(".instagram.com")) {
    return null;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;

  // /reel/CODE, /reels/CODE, /p/CODE, /tv/CODE
  if (
    parts.length >= 2 &&
    ["reel", "reels", "p", "tv"].includes(parts[0]!.toLowerCase()) &&
    isShortcode(parts[1])
  ) {
    return parts[1]!;
  }

  // /username/reel/CODE or /username/p/CODE (profile share links)
  if (
    parts.length >= 3 &&
    ["reel", "reels", "p", "tv"].includes(parts[1]!.toLowerCase()) &&
    isShortcode(parts[2])
  ) {
    return parts[2]!;
  }

  return null;
}

export function isInstagramUrl(raw: string): boolean {
  return extractInstagramShortcode(raw) !== null;
}

/** Stable reel URL used for hashing / dedup. */
export function canonicalInstagramUrl(shortcode: string): string {
  return `https://instagram.com/reel/${shortcode}`;
}
