import type { CaptureSource, RawFetchResult, SourceAdapter } from "../types";

const USER_AGENT =
  "Mozilla/5.0 (compatible; LyvoraBot/0.1; +https://lyvora.app) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function extractMeta(html: string): {
  title: string | null;
  siteName: string | null;
  author: string | null;
  heroImageUrl: string | null;
} {
  const og = (prop: string) => {
    const re = new RegExp(
      `<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`,
      "i",
    );
    const alt = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`,
      "i",
    );
    return html.match(re)?.[1] ?? html.match(alt)?.[1] ?? null;
  };
  const nameMeta = (name: string) => {
    const re = new RegExp(
      `<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`,
      "i",
    );
    return html.match(re)?.[1] ?? null;
  };
  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? null;

  return {
    title: og("og:title") ?? titleTag,
    siteName: og("og:site_name") ?? nameMeta("application-name"),
    author: nameMeta("author"),
    heroImageUrl: og("og:image"),
  };
}

async function fetchHtml(url: string): Promise<{ finalUrl: string; html: string }> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch URL (${response.status})`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("html") && !contentType.includes("text")) {
    throw new Error(`Unsupported content-type: ${contentType}`);
  }
  return { finalUrl: response.url || url, html: await response.text() };
}

async function fetchViaJina(url: string): Promise<string> {
  const response = await fetch(`https://r.jina.ai/${url}`, {
    headers: { Accept: "text/plain", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) {
    throw new Error(`Jina Reader failed (${response.status})`);
  }
  return response.text();
}

export const webAdapter: SourceAdapter = {
  id: "web",
  priority: 0,
  matches(source: CaptureSource) {
    return source.kind === "url" && Boolean(source.rawInput);
  },
  async fetch(source: CaptureSource): Promise<RawFetchResult> {
    const inputUrl = source.canonicalUrl ?? source.rawInput;
    if (!inputUrl) {
      throw new Error("webAdapter requires a URL");
    }

    try {
      const { finalUrl, html } = await fetchHtml(inputUrl);
      const meta = extractMeta(html);
      return {
        adapterId: "web",
        finalUrl,
        contentType: "html",
        html,
        title: meta.title,
        siteName: meta.siteName,
        author: meta.author,
        heroImageUrl: meta.heroImageUrl,
      };
    } catch (primaryError) {
      // JS-heavy pages / bot blocks: fall back to Jina Reader (system_design.md §7).
      const text = await fetchViaJina(inputUrl);
      if (!text.trim()) {
        throw primaryError instanceof Error
          ? primaryError
          : new Error("Failed to fetch URL");
      }
      return {
        adapterId: "web",
        finalUrl: inputUrl,
        contentType: "text",
        text,
        title: null,
        siteName: null,
        author: null,
        heroImageUrl: null,
      };
    }
  },
};
