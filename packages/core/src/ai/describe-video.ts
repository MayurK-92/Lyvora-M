import { generateText } from "ai";
import { definePDFJSModule, getDocumentProxy, renderPageAsImage } from "unpdf";
import { models } from "./models";

/** Keep inline video requests well under Gemini's ~20MB request limit. */
export const MAX_VIDEO_BYTES = 18 * 1024 * 1024;

const MAX_PDF_OCR_PAGES = 5;

const WATCH_PROMPT = `Watch this short video carefully and report everything informative in it:
1. Transcribe all spoken words verbatim (mark as "Transcript:").
2. Transcribe any on-screen text / captions overlaid on the video (mark as "On-screen text:").
3. Describe key visual content someone would want to remember — products shown, steps demonstrated, places, prices, names (mark as "Visuals:").
Be factual and complete. Do not add commentary or opinions.`;

/**
 * Have Gemini "watch" a short video (e.g. an Instagram Reel) and return a
 * text report of speech, on-screen text, and visuals for the understand step.
 */
export async function describeVideo(
  video: Uint8Array,
  mediaType = "video/mp4",
): Promise<string> {
  const { text } = await generateText({
    model: models.fast,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: WATCH_PROMPT },
          { type: "file", data: video, mediaType },
        ],
      },
    ],
  });
  return text.trim();
}

const OCR_IMAGE_PROMPT = `Analyze this image for a personal knowledge base.
1. OCR: transcribe ALL visible text accurately (mark as "Text:").
2. Visuals: describe products, people, places, diagrams, UI, prices, or other informative content (mark as "Visuals:").
Be factual. Do not invent text that is not visible.`;

const OCR_PDF_PAGE_PROMPT = `Analyze this PDF page image for a personal knowledge base.
1. OCR: transcribe ALL visible text accurately (mark as "Text:").
2. Note document type/title if clear (mark as "Title:").
3. Describe diagrams, tables, or other informative visuals briefly (mark as "Visuals:").
Be faithful to the source.`;

function sniffImageMediaType(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
  if (bytes[0] === 0x47 && bytes[1] === 0x49) return "image/gif";
  if (bytes[0] === 0x52 && bytes[1] === 0x49) return "image/webp";
  return "image/jpeg";
}

/** Vision OCR + description for uploaded images. */
export async function describeImage(
  image: Uint8Array,
  mediaType?: string,
): Promise<string> {
  const { text } = await generateText({
    model: models.fast,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: OCR_IMAGE_PROMPT },
          {
            type: "file",
            data: image,
            mediaType: mediaType ?? sniffImageMediaType(image),
          },
        ],
      },
    ],
  });
  return text.trim();
}

let pdfjsConfigured = false;

async function ensurePdfjsForRender() {
  if (pdfjsConfigured) return;
  // Official PDF.js + native canvas required for Node page renders.
  await definePDFJSModule(() => import("pdfjs-dist"));
  pdfjsConfigured = true;
}

/**
 * Vision/OCR path for scanned or low-text PDFs.
 * Renders up to {@link MAX_PDF_OCR_PAGES} pages to images (Gemini Flash-Lite
 * often rejects raw application/pdf uploads).
 */
export async function describePdf(pdf: Uint8Array): Promise<string> {
  await ensurePdfjsForRender();

  // Fresh copies — unpdf/pdf.js may detach ArrayBuffers.
  const original = pdf.slice();
  const proxy = await getDocumentProxy(original.slice());
  const pageCount = Math.min(proxy.numPages || 0, MAX_PDF_OCR_PAGES);
  if (pageCount < 1) {
    throw new Error("PDF has no pages");
  }

  const sections: string[] = [];
  for (let page = 1; page <= pageCount; page += 1) {
    const imageBuffer = await renderPageAsImage(original.slice(), page, {
      canvasImport: () => import("@napi-rs/canvas"),
      scale: 1.5,
    });
    const imageBytes = new Uint8Array(imageBuffer);
    const { text } = await generateText({
      model: models.fast,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${OCR_PDF_PAGE_PROMPT}\n(Page ${page} of ${pageCount})`,
            },
            {
              type: "file",
              data: imageBytes,
              mediaType: "image/png",
            },
          ],
        },
      ],
    });
    if (text.trim()) {
      sections.push(`--- Page ${page} ---\n${text.trim()}`);
    }
  }

  if (!sections.length) {
    throw new Error("Could not OCR PDF pages");
  }
  return sections.join("\n\n");
}
