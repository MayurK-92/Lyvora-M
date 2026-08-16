"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button, Dialog, MaterialIcon, Textarea } from "@lyvora/ui";

/**
 * memory_detail_lyvora's actions card. "Add Note" runs the existing capture
 * pipeline so the note becomes a first-class memory that the graph can link
 * back to this one; "Share Memory" uses the Web Share API with a clipboard
 * fallback.
 */
export function MemoryActions({
  memoryId,
  title,
}: {
  memoryId: string;
  title: string;
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareLabel, setShareLabel] = useState("Share Memory");
  const [pending, startTransition] = useTransition();

  function saveNote() {
    const text = note.trim();
    if (!text) return;
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/capture", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": crypto.randomUUID(),
          },
          body: JSON.stringify({
            kind: "text",
            input: `${text}\n\n— note on “${title}”`,
            note: `Note on ${title}`,
            client: "web",
          }),
        });
        const data = (await response.json()) as { captureId?: string; error?: string };
        if (!response.ok || !data.captureId) {
          throw new Error(data.error ?? "Could not save that note.");
        }
        setSavedId(data.captureId);
        setNote("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save that note.");
      }
    });
  }

  async function share() {
    const url = `${window.location.origin}/memory/${memoryId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareLabel("Link copied");
      window.setTimeout(() => setShareLabel("Share Memory"), 1600);
    } catch {
      // A cancelled share sheet is not an error worth surfacing.
    }
  }

  return (
    <>
      <div className="flex flex-col gap-sm rounded-xl bg-surface-container-lowest p-md shadow-sm">
        <Button
          type="button"
          shape="rounded"
          block
          className="py-sm"
          onClick={() => {
            setSavedId(null);
            setNoteOpen(true);
          }}
        >
          <MaterialIcon name="edit" size={20} />
          Add Note
        </Button>
        <Button type="button" variant="soft" shape="rounded" block className="py-sm" onClick={share}>
          <MaterialIcon name="share" size={20} />
          {shareLabel}
        </Button>
      </div>

      <Dialog
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        title="Add a note"
        description={`Your note is saved as its own memory and linked back to “${title}”.`}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setNoteOpen(false)}>
              Close
            </Button>
            <Button type="button" onClick={saveNote} disabled={pending || !note.trim()}>
              {pending ? "Saving…" : "Save note"}
            </Button>
          </>
        }
      >
        <Textarea
          autoGrow
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          aria-label="Note"
          placeholder="What do you want to remember about this?"
        />
        {savedId && (
          <p className="mt-sm text-label-md text-on-surface-variant">
            Saved.{" "}
            <Link href="/home" className="text-primary underline-offset-4 hover:underline">
              Watch it process on Home
            </Link>
            .
          </p>
        )}
        {error && (
          <p role="alert" className="mt-sm text-label-md text-error">
            {error}
          </p>
        )}
      </Dialog>
    </>
  );
}
