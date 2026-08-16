import { randomUUID } from "node:crypto";
import {
  CAPTURES_BUCKET,
  UnsafeUrlError,
  assertPublicHttpUrl,
} from "@lyvora/core";
import { inngest } from "@/inngest/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ShareClient } from "./extract-shared";

export type SharedCaptureResult =
  | { ok: true; captureId: string }
  | { ok: false; error: string; status: number };

async function insertAndEnqueue(input: {
  userId: string;
  kind: "url" | "text" | "pdf" | "image";
  rawInput?: string | null;
  uploadPath?: string | null;
  note?: string | null;
  client: ShareClient;
}): Promise<SharedCaptureResult> {
  const supabase = await createSupabaseServerClient();
  const { data: capture, error } = await supabase
    .from("captures")
    .insert({
      user_id: input.userId,
      kind: input.kind,
      raw_input: input.rawInput ?? null,
      upload_path: input.uploadPath ?? null,
      user_note: input.note ?? null,
      client: input.client,
      status: "queued",
    })
    .select("id")
    .single();

  if (error || !capture) {
    return {
      ok: false,
      error: error?.message ?? "Failed to create capture",
      status: 500,
    };
  }

  try {
    await inngest.send({
      name: "capture.created",
      data: { captureId: capture.id, userId: input.userId },
    });
  } catch (err) {
    console.error("[share] inngest.send failed", err);
  }

  return { ok: true, captureId: capture.id };
}

export async function createUrlOrTextCapture(input: {
  userId: string;
  url?: string | null;
  text?: string | null;
  title?: string | null;
  client: ShareClient;
}): Promise<SharedCaptureResult> {
  if (input.url) {
    try {
      await assertPublicHttpUrl(input.url);
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof UnsafeUrlError
            ? error.message
            : "This URL isn't a public web page Lyvora can fetch.",
        status: 400,
      };
    }
    return insertAndEnqueue({
      userId: input.userId,
      kind: "url",
      rawInput: input.url,
      note: input.title ?? null,
      client: input.client,
    });
  }

  const text = (input.text ?? input.title ?? "").trim();
  if (!text) {
    return { ok: false, error: "Nothing to save", status: 400 };
  }

  return insertAndEnqueue({
    userId: input.userId,
    kind: "text",
    rawInput: text,
    client: input.client,
  });
}

export async function createFileCapture(input: {
  userId: string;
  file: File;
  note?: string | null;
  client: ShareClient;
}): Promise<SharedCaptureResult> {
  const contentType = input.file.type || "application/octet-stream";
  const isPdf = contentType === "application/pdf";
  const isImage = contentType.startsWith("image/");
  if (!isPdf && !isImage) {
    return {
      ok: false,
      error: "Unsupported file type. Use PDF or an image.",
      status: 400,
    };
  }
  if (input.file.size > 25 * 1024 * 1024) {
    return { ok: false, error: "File too large. Max size is 25 MB.", status: 400 };
  }

  const ext = isPdf
    ? "pdf"
    : contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
        ? "webp"
        : contentType.includes("gif")
          ? "gif"
          : "jpg";
  const path = `${input.userId}/${randomUUID()}.${ext}`;
  const supabase = await createSupabaseServerClient();
  const bytes = new Uint8Array(await input.file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(CAPTURES_BUCKET)
    .upload(path, bytes, { contentType, upsert: false });

  if (uploadError) {
    return {
      ok: false,
      error: uploadError.message ?? "Upload failed",
      status: 500,
    };
  }

  return insertAndEnqueue({
    userId: input.userId,
    kind: isPdf ? "pdf" : "image",
    uploadPath: path,
    note: input.note ?? null,
    client: input.client,
  });
}
