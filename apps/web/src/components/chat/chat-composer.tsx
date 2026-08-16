"use client";

import { useRef, useState } from "react";
import { MaterialIcon, Textarea } from "@lyvora/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * chat_lyvora's glassmorphic composer (lines 143–163). The paperclip runs the
 * app's existing capture pipeline — in Lyvora an attachment becomes a memory
 * first, then it is answerable like anything else you saved.
 */
export function ChatComposer({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<string | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);

  async function attach(file: File) {
    setAttachError(null);
    setAttachment(`Saving ${file.name}…`);
    try {
      const signResponse = await fetch("/api/capture/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          sizeBytes: file.size,
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
        .uploadToSignedUrl(signed.path, signed.token, file, {
          contentType: file.type || undefined,
          upsert: false,
        });
      if (uploadError) throw new Error(uploadError.message);

      const captureResponse = await fetch("/api/capture", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          kind: file.type === "application/pdf" ? "pdf" : "image",
          uploadPath: signed.path,
          client: "web",
        }),
      });
      const data = (await captureResponse.json()) as { error?: string };
      if (!captureResponse.ok) throw new Error(data.error ?? "Could not save that file.");

      setAttachment(`${file.name} saved — ask about it once processing finishes.`);
    } catch (err) {
      setAttachment(null);
      setAttachError(err instanceof Error ? err.message : "Could not attach that file.");
    }
  }

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-surface via-surface/90 to-transparent p-lg pt-xl max-lg:pb-20">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="group relative mx-auto max-w-3xl"
      >
        <div className="flex items-end rounded-[2rem] bg-surface-container-lowest/80 p-sm shadow-[0_8px_30px_rgba(0,0,0,0.08)] ring-1 ring-outline-variant/30 backdrop-blur-xl transition-shadow focus-within:ring-2 focus-within:ring-primary">
          <button
            type="button"
            aria-label="Attach a PDF or image"
            title="Attach a PDF or image"
            disabled={disabled}
            onClick={() => fileRef.current?.click()}
            className="mb-xs rounded-full p-sm text-on-surface-variant transition-colors outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
          >
            <MaterialIcon name="attach_file" />
          </button>
          <input
            ref={fileRef}
            type="file"
            className="sr-only"
            accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void attach(file);
            }}
          />

          <Textarea
            autoGrow
            rows={1}
            value={value}
            disabled={disabled}
            aria-label="Ask your knowledge base"
            placeholder="Ask your knowledge base..."
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSubmit();
              }
            }}
            className="flex-1 border-none bg-transparent px-sm py-md text-body-lg placeholder:text-on-surface-variant/60 focus-visible:ring-0"
          />

          <button
            type="submit"
            aria-label="Send"
            disabled={disabled || !value.trim()}
            className="mb-xs rounded-full bg-primary p-sm text-on-primary shadow-md shadow-primary/20 transition-all outline-none hover:scale-105 hover:bg-primary-container hover:text-on-primary-container focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
          >
            <MaterialIcon name="send" filled />
          </button>
        </div>

        <div className="absolute -top-6 left-6 flex items-center gap-xs text-label-sm text-on-surface-variant opacity-0 transition-opacity group-focus-within:opacity-100">
          <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-primary" />
          Context: Global Memory
        </div>

        {(attachment || attachError) && (
          <p
            aria-live="polite"
            className={`mt-sm text-center text-label-sm ${attachError ? "text-error" : "text-on-surface-variant"}`}
          >
            {attachError ?? attachment}
          </p>
        )}
      </form>
    </div>
  );
}
