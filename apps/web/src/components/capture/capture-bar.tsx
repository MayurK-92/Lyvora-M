"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  BareInput,
  Button,
  MaterialIcon,
  SegmentedTabs,
  Textarea,
  cn,
  type SegmentedTabItem,
} from "@lyvora/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useClientValue } from "@/lib/use-client-value";

export type CapturePipelineStatus =
  | "queued"
  | "fetching"
  | "extracting"
  | "enriching"
  | "embedding"
  | "done"
  | "failed"
  | "duplicate";

export interface PendingCapture {
  captureId: string;
  url: string;
  createdAt: string;
  status: CapturePipelineStatus;
  lastError?: string | null;
}

type CaptureMode = "link" | "text" | "file";

const MODES: ReadonlyArray<SegmentedTabItem<CaptureMode>> = [
  { value: "link", label: "Link", icon: "link" },
  { value: "text", label: "Text", icon: "edit_note" },
  { value: "file", label: "File", icon: "upload_file" },
];

/**
 * home_lyvora's fixed glassmorphic capture pill (lines 118–138). The mode row
 * and the input row live inside one rounded-full shell that grows downward for
 * text and file modes rather than moving.
 */
export function CaptureBar({
  onQueued,
}: {
  onQueued: (pending: PendingCapture) => void;
}) {
  const [mode, setMode] = useState<CaptureMode>("link");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const mounted = useClientValue(() => true, false);

  function queueSuccess(captureId: string, label: string, warning?: string) {
    onQueued({
      captureId,
      url: label,
      createdAt: new Date().toISOString(),
      status: "queued",
    });
    setUrl("");
    setText("");
    setFile(null);
    setNote("");
    setNoteOpen(false);
    if (warning) setError(warning);
  }

  async function postCapture(body: Record<string, unknown>) {
    const response = await fetch("/api/capture", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({ ...body, client: "web" }),
    });

    let data: {
      captureId?: string;
      error?: string;
      warning?: string;
    } = {};
    try {
      data = (await response.json()) as typeof data;
    } catch {
      throw new Error(
        response.ok
          ? "Unexpected response from server."
          : `Save failed (${response.status}). Is the app running?`,
      );
    }

    if (!response.ok || !data.captureId) {
      throw new Error(data.error ?? "Could not save that capture.");
    }
    return data;
  }

  async function uploadFile(selected: File) {
    const signResponse = await fetch("/api/capture/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: selected.name,
        contentType: selected.type || "application/octet-stream",
        sizeBytes: selected.size,
      }),
    });
    const signed = (await signResponse.json()) as {
      path?: string;
      token?: string;
      error?: string;
    };
    if (!signResponse.ok || !signed.path || !signed.token) {
      throw new Error(signed.error ?? "Could not start upload.");
    }

    const supabase = createSupabaseBrowserClient();
    const { error: uploadError } = await supabase.storage
      .from("captures")
      .uploadToSignedUrl(signed.path, signed.token, selected, {
        contentType: selected.type || undefined,
        upsert: false,
      });
    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const kind = selected.type === "application/pdf" ? "pdf" : "image";
    return postCapture({
      kind,
      uploadPath: signed.path,
      note: note.trim() || undefined,
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        if (mode === "link") {
          const data = await postCapture({
            kind: "url",
            input: url.trim(),
            note: note.trim() || undefined,
          });
          queueSuccess(data.captureId!, url.trim(), data.warning);
          return;
        }

        if (mode === "text") {
          const data = await postCapture({
            kind: "text",
            input: text.trim(),
            note: note.trim() || undefined,
          });
          const label =
            text.trim().split(/\r?\n/).find((line) => line.trim())?.slice(0, 80) ?? "Note";
          queueSuccess(data.captureId!, label, data.warning);
          return;
        }

        if (!file) {
          setError("Choose a PDF or image to upload.");
          return;
        }
        const data = await uploadFile(file);
        queueSuccess(data.captureId!, file.name, data.warning);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Network error. Check that `pnpm dev` is running, then try again.",
        );
      }
    });
  }

  const canSubmit =
    mode === "link"
      ? Boolean(url.trim())
      : mode === "text"
        ? Boolean(text.trim())
        : Boolean(file);

  if (!mounted) return null;

  return createPortal(
    <div
      className={cn(
        "fixed bottom-lg z-40 w-[90%] max-w-3xl -translate-x-1/2 max-lg:bottom-20",
        // Center in the content column on desktop (sidebar is w-72 / 18rem).
        "left-1/2 lg:left-[calc(50%+9rem)]",
      )}
    >
      <form
        onSubmit={handleSubmit}
        aria-label="Save to Lyvora"
        className={cn(
          "flex flex-col border border-outline-variant/20 bg-surface/80 p-xs shadow-[0_10px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl",
          mode === "link" ? "rounded-full" : "rounded-2xl",
        )}
      >
        <div className="flex items-center gap-xs px-md pb-xs pt-sm">
          <SegmentedTabs
            label="Capture type"
            items={MODES}
            value={mode}
            disabled={pending}
            onValueChange={(next) => {
              setMode(next);
              setError(null);
            }}
          />
          <button
            type="button"
            onClick={() => setNoteOpen((open) => !open)}
            aria-expanded={noteOpen}
            className={cn(
              "ml-auto flex items-center gap-1 rounded-full px-3 py-1.5 text-label-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              noteOpen
                ? "bg-secondary-container text-on-secondary-container"
                : "text-on-surface-variant hover:bg-surface-container-high",
            )}
          >
            <MaterialIcon name="draw" size={16} />
            Note
          </button>
        </div>

        {mode === "link" && (
          <div className="flex items-center gap-sm px-md pb-sm pt-xs">
            <BareInput
              type="url"
              required
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              disabled={pending}
              aria-label="Link to save"
              placeholder="Paste a URL or type a note..."
              className="min-w-0 flex-1 py-2"
            />
            <SaveButton pending={pending} disabled={!canSubmit} />
          </div>
        )}

        {mode === "text" && (
          <div className="flex items-end gap-sm px-md pb-sm pt-xs">
            <Textarea
              required
              autoGrow
              rows={2}
              value={text}
              onChange={(event) => setText(event.target.value)}
              disabled={pending}
              aria-label="Note to save"
              placeholder="Paste or type a note to remember…"
              className="min-w-0 flex-1 border-none bg-transparent px-0 py-2 text-body-lg focus-visible:ring-0"
            />
            <SaveButton pending={pending} disabled={!canSubmit} />
          </div>
        )}

        {mode === "file" && (
          <div className="flex items-center gap-sm px-md pb-sm pt-xs">
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-sm rounded-xl border border-dashed border-outline-variant px-md py-sm text-body-md text-on-surface-variant transition-colors hover:bg-surface-container-high">
              <MaterialIcon name="upload_file" size={20} />
              <span className="truncate">{file ? file.name : "PDF or image — up to 25 MB"}</span>
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                disabled={pending}
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <SaveButton pending={pending} disabled={!canSubmit} />
          </div>
        )}

        {noteOpen && (
          <div className="px-md pb-sm">
            <BareInput
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={pending}
              aria-label="Optional note"
              placeholder="Why are you saving this?"
              className="border-t border-outline-variant/30 pt-sm text-body-md"
            />
          </div>
        )}

        {pending && (
          <div className="px-md pb-sm" aria-live="polite">
            <div className="h-1 w-full overflow-hidden rounded-full bg-surface-container-high">
              <div className="h-full w-1/2 animate-[progress_1.5s_ease-in-out_infinite] rounded-full bg-primary" />
            </div>
            <p className="mt-xs text-label-sm text-on-surface-variant">
              {mode === "file" ? "Uploading & starting save…" : "Starting save…"}
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="px-md pb-sm text-label-sm text-error">
            {error}
          </p>
        )}
      </form>
    </div>,
    document.body,
  );
}

function SaveButton({
  pending,
  disabled,
}: {
  pending: boolean;
  disabled: boolean;
}) {
  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      size="md"
      shape="pill"
      className="shrink-0 gap-1 px-4 py-2 shadow-sm focus-visible:ring-offset-0"
    >
      {pending ? "Saving…" : "Save"}
      <MaterialIcon name="arrow_upward" size={18} />
    </Button>
  );
}
