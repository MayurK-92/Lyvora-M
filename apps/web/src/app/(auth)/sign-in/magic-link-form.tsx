"use client";

import { useActionState } from "react";
import { Button, Input, Label, MaterialIcon } from "@lyvora/ui";
import { sendMagicLinkAction, type MagicLinkState } from "../actions";

const initialState: MagicLinkState = { status: "idle" };

export function MagicLinkForm({ next = "/home" }: { next?: string }) {
  const [state, formAction, pending] = useActionState(sendMagicLinkAction, initialState);

  if (state.status === "sent") {
    return (
      <div
        role="status"
        className="flex items-start gap-sm rounded-2xl bg-secondary-container px-md py-md text-on-secondary-container"
      >
        <MaterialIcon name="send" size={20} className="mt-0.5 shrink-0" />
        <div>
          <p className="text-label-md">Check your inbox</p>
          <p className="mt-1 text-body-md leading-relaxed">
            We sent a sign-in link. It may take a minute to arrive.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-md">
      <input type="hidden" name="next" value={next} />
      <div className="flex flex-col gap-xs">
        <Label htmlFor="email" className="uppercase tracking-widest">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
          autoFocus
          className="h-12"
        />
      </div>
      {state.status === "error" && (
        <p role="alert" className="text-body-md text-error">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending} block shape="rounded" className="h-12">
        {pending ? "Sending…" : "Continue with email"}
        <MaterialIcon name="arrow_forward" size={18} />
      </Button>
    </form>
  );
}
