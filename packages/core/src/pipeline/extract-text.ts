import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import type { ExtractedText, RawFetchResult } from "./types";

/** Rough token budget (~4 chars/token). Head + middle headings + tail. */
const CHAR_BUDGET = 12_000 * 4;

function truncateForModel(text: string): string {
  if (text.length <= CHAR_BUDGET) return text;
  const head = Math.floor(CHAR_BUDGET * 0.45);
  const tail = Math.floor(CHAR_BUDGET * 0.25);
  const midBudget = CHAR_BUDGET - head - tail;
  const middleStart = Math.floor((text.length - midBudget) / 2);
  return [
    text.slice(0, head),
    "\n\n[...]\n\n",
    text.slice(middleStart, middleStart + midBudget),
    "\n\n[...]\n\n",
    text.slice(-tail),
  ].join("");
}

function headingsFromHtml(html: string): string[] {
  const matches = html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi);
  const headings: string[] = [];
  for (const match of matches) {
    const text = match[1]?.replace(/<[^>]+>/g, "").trim();
    if (text) headings.push(text);
    if (headings.length >= 40) break;
  }
  return headings;
}

export function extractText(fetched: RawFetchResult): ExtractedText {
  if (
    fetched.contentType === "text" ||
    fetched.contentType === "pdf" ||
    fetched.contentType === "image" ||
    (!fetched.html && fetched.text)
  ) {
    const text = truncateForModel((fetched.text ?? "").trim());
    if (!text) {
      throw new Error("Could not extract readable text");
    }
    return {
      text,
      headings: [],
      title: fetched.title,
      siteName: fetched.siteName,
      author: fetched.author,
      heroImageUrl: fetched.heroImageUrl,
      publishedAt: fetched.publishedAt,
      sourceUrl: fetched.finalUrl,
    };
  }

  const html = fetched.html ?? "";
  const { document } = parseHTML(html);
  const article = new Readability(document).parse();
  const rawText = (article?.textContent ?? document.body?.textContent ?? "")
    .replace(/\s+/g, " ")
    .trim();

  if (!rawText) {
    throw new Error("Could not extract readable text from page");
  }

  return {
    text: truncateForModel(rawText),
    headings: headingsFromHtml(html),
    title: article?.title ?? fetched.title,
    siteName: fetched.siteName,
    author: article?.byline ?? fetched.author,
    heroImageUrl: fetched.heroImageUrl,
    publishedAt: fetched.publishedAt,
    sourceUrl: fetched.finalUrl,
  };
}
