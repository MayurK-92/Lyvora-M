const URL_IN_TEXT =
  /https?:\/\/[^\s<>"')\]]+/i;

export function extractUrlCandidate(input: {
  url?: string | null;
  text?: string | null;
  title?: string | null;
}): string | null {
  const direct = input.url?.trim();
  if (direct && looksLikeUrl(direct)) return normalizeUrl(direct);

  const text = input.text?.trim() ?? "";
  if (text && looksLikeUrl(text)) return normalizeUrl(text);

  const fromText = text.match(URL_IN_TEXT)?.[0];
  if (fromText) return normalizeUrl(fromText);

  const title = input.title?.trim() ?? "";
  const fromTitle = title.match(URL_IN_TEXT)?.[0];
  if (fromTitle) return normalizeUrl(fromTitle);

  return null;
}

function looksLikeUrl(value: string): boolean {
  try {
    const u = new URL(value.includes("://") ? value : `https://${value}`);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeUrl(value: string): string {
  const withProtocol = value.includes("://") ? value : `https://${value}`;
  return new URL(withProtocol).toString();
}

export type ShareClient = "share_target" | "shortcut" | "web";

export function parseShareClient(value: string | null | undefined): ShareClient {
  if (value === "shortcut" || value === "share_target" || value === "web") {
    return value;
  }
  return "share_target";
}
