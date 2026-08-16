"use client";

import { useState, useTransition } from "react";
import { Button, Dialog, MaterialIcon } from "@lyvora/ui";
import { deleteAccountAction } from "@/app/(app)/settings/actions";

export function DeleteAccountDialog() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    if (pending) return;
    setOpen(false);
    setConfirm("");
    setError(null);
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        shape="rounded"
        className="text-error hover:bg-error-container hover:text-on-error-container"
        onClick={() => setOpen(true)}
      >
        <MaterialIcon name="delete" size={18} />
        Delete account
      </Button>

      <Dialog
        open={open}
        onClose={close}
        title="Delete your account?"
        description="This permanently removes your memories, uploads, chat, and graph. Export first if you want a copy."
        footer={
          <>
            <Button type="button" variant="ghost" shape="rounded" onClick={close} disabled={pending}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="delete-account-form"
              variant="destructive"
              shape="rounded"
              disabled={confirm.trim().toLowerCase() !== "delete" || pending}
            >
              {pending ? "Deleting…" : "Delete forever"}
            </Button>
          </>
        }
      >
        <form
          id="delete-account-form"
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              try {
                await deleteAccountAction(formData);
              } catch (err) {
                if (
                  typeof err === "object" &&
                  err &&
                  "digest" in err &&
                  String((err as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
                ) {
                  throw err;
                }
                setError(err instanceof Error ? err.message : "Could not delete the account.");
              }
            });
          }}
          className="space-y-sm"
        >
          <label className="block">
            <span className="mb-xs block text-label-sm font-normal text-on-surface-variant">
              Type DELETE to confirm
            </span>
            <input
              name="confirm"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              autoComplete="off"
              className="flex h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md text-body-md text-on-surface outline-none focus-visible:border-error focus-visible:ring-2 focus-visible:ring-error/20"
            />
          </label>
          {error && (
            <p role="alert" className="text-label-sm text-error">
              {error}
            </p>
          )}
        </form>
      </Dialog>
    </>
  );
}
