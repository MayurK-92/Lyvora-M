import { generateObject } from "ai";
import { EXTRACT_MODEL_ID, models } from "../ai/models";
import {
  EXTRACTION_PROMPT_VERSION,
  EXTRACTION_SYSTEM_PROMPT,
  buildExtractionPrompt,
} from "../ai/prompts/extraction";
import { KnowledgeExtraction } from "../schemas/extraction";
import type { ExtractedText } from "./types";

export interface UnderstandResult {
  knowledge: KnowledgeExtraction;
  aiMeta: {
    model: string;
    promptVersion: string;
    inputTokens?: number;
    outputTokens?: number;
    confidence: number;
  };
}

export async function understand(
  extracted: ExtractedText,
  userNote?: string | null,
): Promise<UnderstandResult> {
  const { object, usage } = await generateObject({
    model: models.extract,
    schema: KnowledgeExtraction,
    system: EXTRACTION_SYSTEM_PROMPT,
    prompt: buildExtractionPrompt({
      text: extracted.text,
      metadata: {
        title: extracted.title,
        siteName: extracted.siteName,
        author: extracted.author,
        url: extracted.sourceUrl,
      },
      userNote,
    }),
    maxRetries: 2,
  });

  return {
    knowledge: object,
    aiMeta: {
      model: EXTRACT_MODEL_ID,
      promptVersion: EXTRACTION_PROMPT_VERSION,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      confidence: object.confidence,
    },
  };
}
