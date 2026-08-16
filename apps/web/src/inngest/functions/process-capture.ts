import {
  assertPublicHttpUrl,
  canonicalizeUrl,
  chunkAndEmbed,
  extractText,
  finalizeCapture,
  findMemoryByUrlHash,
  hashUrl,
  linkAndDedup,
  loadCaptureForPipeline,
  markCaptureFailed,
  mergeDuplicateCapture,
  persistMemory,
  resolveAdapter,
  setCaptureStatus,
  understand,
  type CaptureSource,
} from "@lyvora/core";
import { getServerEnv } from "@/lib/env.server";
import { inngest } from "../client";

function sourceTypeFor(
  kind: CaptureSource["kind"],
  adapterId: string,
): "web" | "youtube" | "instagram" | "text" | "pdf" | "image" {
  if (kind === "text" || kind === "pdf" || kind === "image") return kind;
  if (adapterId === "youtube") return "youtube";
  if (adapterId === "instagram") return "instagram";
  return "web";
}

export const processCapture = inngest.createFunction(
  {
    id: "process-capture",
    retries: 4,
    concurrency: [{ key: "event.data.userId", limit: 3 }],
    triggers: [{ event: "capture.created" }],
    onFailure: async ({ event, error }) => {
      const data = event.data.event?.data as
        | { captureId?: string; userId?: string }
        | undefined;
      if (data?.captureId && data?.userId) {
        await markCaptureFailed(data.captureId, data.userId, error.message);
      }
    },
  },
  async ({ event, step }) => {
    getServerEnv();

    const { captureId, userId } = event.data as {
      captureId: string;
      userId: string;
    };

    const resolved = await step.run("resolve-source", async () => {
      const capture = await loadCaptureForPipeline(captureId, userId);
      if (!capture) {
        throw new Error("Capture not found");
      }

      if (capture.kind === "url") {
        if (!capture.rawInput) {
          throw new Error("URL capture missing input");
        }
        await assertPublicHttpUrl(capture.rawInput);
        const canonicalUrl = canonicalizeUrl(capture.rawInput);
        const urlHash = hashUrl(canonicalUrl);
        const draft: CaptureSource = {
          captureId,
          userId,
          kind: capture.kind,
          rawInput: capture.rawInput,
          uploadPath: capture.uploadPath,
          userNote: capture.userNote,
          canonicalUrl,
          urlHash,
          adapterId: "web",
        };
        const adapter = resolveAdapter(draft);
        const existing = await findMemoryByUrlHash(userId, urlHash);
        return {
          ...draft,
          adapterId: adapter.id,
          duplicateOf: existing?.id,
        } satisfies CaptureSource;
      }

      if (capture.kind === "text") {
        if (!capture.rawInput?.trim()) {
          throw new Error("Text capture missing input");
        }
        const draft: CaptureSource = {
          captureId,
          userId,
          kind: "text",
          rawInput: capture.rawInput,
          uploadPath: null,
          userNote: capture.userNote,
          adapterId: "text",
        };
        return { ...draft, adapterId: resolveAdapter(draft).id };
      }

      if (capture.kind === "pdf" || capture.kind === "image") {
        if (!capture.uploadPath) {
          throw new Error(`${capture.kind} capture missing upload_path`);
        }
        if (!capture.uploadPath.startsWith(`${userId}/`)) {
          throw new Error("upload_path does not belong to user");
        }
        const draft: CaptureSource = {
          captureId,
          userId,
          kind: capture.kind,
          rawInput: null,
          uploadPath: capture.uploadPath,
          userNote: capture.userNote,
          adapterId: capture.kind,
        };
        return { ...draft, adapterId: resolveAdapter(draft).id };
      }

      throw new Error(`Unsupported capture kind: ${capture.kind}`);
    });

    if (resolved.duplicateOf) {
      await step.run("merge-duplicate", () =>
        mergeDuplicateCapture({
          captureId,
          userId,
          memoryId: resolved.duplicateOf!,
        }),
      );
      return { memoryId: resolved.duplicateOf, duplicate: true };
    }

    const fetched = await step.run("fetch-content", async () => {
      await setCaptureStatus(captureId, userId, "fetching");
      const adapter = resolveAdapter(resolved);
      return adapter.fetch(resolved);
    });

    const extracted = await step.run("extract-text", async () => {
      await setCaptureStatus(captureId, userId, "extracting");
      return extractText(fetched);
    });

    const understandResult = await step.run("understand", async () => {
      await setCaptureStatus(captureId, userId, "enriching");
      return understand(extracted, resolved.userNote);
    });

    const memoryId = await step.run("persist-memory", () =>
      persistMemory({
        userId,
        captureId,
        urlHash: resolved.urlHash,
        canonicalUrl: resolved.canonicalUrl,
        storagePath: resolved.uploadPath,
        extracted,
        understandResult,
        sourceType: sourceTypeFor(resolved.kind, resolved.adapterId),
      }),
    );

    await step.run("chunk-and-embed", async () => {
      await setCaptureStatus(captureId, userId, "embedding");
      await chunkAndEmbed(memoryId, userId);
    });

    const linkResult = await step.run("link-and-dedup", () =>
      linkAndDedup(memoryId, userId),
    );

    await step.run("finalize", () =>
      finalizeCapture(captureId, userId, memoryId),
    );

    return {
      memoryId,
      duplicate: Boolean(linkResult.duplicateOf),
      duplicateOf: linkResult.duplicateOf,
    };
  },
);
