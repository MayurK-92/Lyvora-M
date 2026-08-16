"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, IconButton, MaterialIcon } from "@lyvora/ui";
import { useClientValue } from "@/lib/use-client-value";

const STORAGE_KEY = "lyvora.onboarding.v1";

function wasDismissed() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "dismissed";
  } catch {
    return false;
  }
}

const STEPS = [
  {
    icon: "add" as const,
    body: (
      <>Paste a link, note, PDF, or image in the bar below to create your first memory.</>
    ),
  },
  {
    icon: "touch_app" as const,
    body: (
      <>
        Install the app from{" "}
        <Link href="/settings" className="text-primary underline-offset-4 hover:underline">
          Settings
        </Link>{" "}
        to share links from other apps.
      </>
    ),
  },
  {
    icon: "auto_awesome" as const,
    body: (
      <>
        Try{" "}
        <Link href="/search" className="text-primary underline-offset-4 hover:underline">
          Search
        </Link>{" "}
        or{" "}
        <Link href="/chat" className="text-primary underline-offset-4 hover:underline">
          Chat
        </Link>{" "}
        over what you&apos;ve saved.
      </>
    ),
  },
];

export function OnboardingCard() {
  // Stays hidden until hydration so the server markup never shows a card the
  // user already dismissed.
  const dismissedBefore = useClientValue(wasDismissed, true);
  const [dismissed, setDismissed] = useState(false);

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "dismissed");
    } catch {
      // Private-mode storage failures shouldn't keep the card on screen.
    }
    setDismissed(true);
  }

  if (dismissedBefore || dismissed) return null;

  return (
    <section
      aria-label="Getting started"
      className="relative mb-2xl overflow-hidden rounded-2xl bg-surface-container-low p-lg"
    >
      <div
        aria-hidden="true"
        className="absolute -right-24 -top-24 size-64 rounded-full bg-primary-fixed/20 blur-3xl mix-blend-multiply"
      />
      <div className="absolute right-sm top-sm z-10">
        <IconButton icon="close" label="Dismiss getting started" size="sm" onClick={dismiss} />
      </div>

      <div className="relative z-10">
        <h2 className="mb-lg flex items-center gap-sm text-headline-md text-on-surface">
          <MaterialIcon name="lightbulb" className="text-secondary" />
          Get started
        </h2>

        <ol className="grid grid-cols-1 gap-md sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={index} className="flex items-start gap-sm rounded-xl bg-surface p-md shadow-sm">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container">
                <MaterialIcon name={step.icon} size={20} />
              </span>
              <p className="text-body-md text-on-surface-variant">{step.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-lg">
          <Button type="button" variant="outline" onClick={dismiss}>
            Got it
          </Button>
        </div>
      </div>
    </section>
  );
}
