"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Button, MaterialIcon } from "@lyvora/ui";
import { useClientValue } from "@/lib/use-client-value";

function isLocalOrigin(origin: string) {
  try {
    const host = new URL(origin).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  } catch {
    return true;
  }
}

function StepBlock({
  step,
  title,
  children,
  action,
}: {
  step: number;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
      <div className="flex items-start gap-sm border-b border-outline-variant/30 px-md py-sm">
        <span
          aria-hidden="true"
          className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-label-sm font-bold text-on-secondary-container"
        >
          {step}
        </span>
        <h3 className="pt-0.5 text-label-md text-on-surface">{title}</h3>
      </div>
      <div className="space-y-md px-md py-md">
        <div className="text-body-md leading-relaxed text-on-surface-variant">
          {children}
        </div>
        {action}
      </div>
    </section>
  );
}

export function CaptureHelpers() {
  const origin = useClientValue(() => window.location.origin, "");
  const [copied, setCopied] = useState<"bookmarklet" | "shortcut" | null>(null);

  const local = !origin || isLocalOrigin(origin);

  const bookmarklet = useMemo(() => {
    if (!origin) return "#";
    return `javascript:void(location.href=${JSON.stringify(
      `${origin}/share?client=shortcut&url=`,
    )}+encodeURIComponent(location.href))`;
  }, [origin]);

  const shortcutTemplate = origin
    ? `${origin}/share?client=shortcut&url=`
    : "/share?client=shortcut&url=";

  async function copy(kind: "bookmarklet" | "shortcut", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard permission failures leave the label unchanged.
    }
  }

  const bookmarkletAction = (
    <div className="flex flex-wrap items-center gap-sm">
      <a
        href={bookmarklet}
        onClick={(event) => event.preventDefault()}
        className="flex cursor-grab items-center gap-xs rounded-full bg-secondary-container px-md py-sm text-label-md text-on-secondary-container shadow-sm"
      >
        <MaterialIcon name="bookmark" size={18} />
        Save to Lyvora
      </a>
      <Button
        type="button"
        variant="outline"
        onClick={() => copy("bookmarklet", bookmarklet)}
      >
        {copied === "bookmarklet" ? "Copied" : "Copy"}
      </Button>
    </div>
  );

  // Install / share-target and iOS Shortcuts need a public HTTPS origin.
  if (local) {
    return (
      <div className="space-y-md">
        <StepBlock step={1} title="Bookmarklet" action={bookmarkletAction}>
          <p>
            Drag the chip to your bookmarks bar (or copy it). Click it on any page
            while signed in to save that URL.
          </p>
        </StepBlock>
      </div>
    );
  }

  return (
    <div className="space-y-md">
      <StepBlock step={1} title="Install the app">
        <p>
          Chrome menu → <span className="text-on-surface">Install Lyvora</span> /{" "}
          <span className="text-on-surface">Add to Home screen</span>. Then share links
          into Lyvora from any app.
        </p>
      </StepBlock>

      <StepBlock step={2} title="Bookmarklet" action={bookmarkletAction}>
        <p>
          Drag the chip to your bookmarks bar (or copy it). Click it on any page while
          signed in.
        </p>
      </StepBlock>

      <StepBlock
        step={3}
        title="iOS Shortcut"
        action={
          <div className="space-y-sm">
            <code className="block break-all rounded-lg bg-surface-container px-md py-sm text-label-sm font-normal text-on-surface">
              {shortcutTemplate}
              {"[URL]"}
            </code>
            <Button
              type="button"
              variant="outline"
              onClick={() => copy("shortcut", shortcutTemplate)}
            >
              {copied === "shortcut" ? "Copied" : "Copy URL prefix"}
            </Button>
          </div>
        }
      >
        <ol className="list-decimal space-y-1 pl-4">
          <li>Shortcuts → New → Receive URLs from Share Sheet</li>
          <li>
            Open URLs → paste the prefix, append the shared URL after{" "}
            <code className="text-label-sm text-on-surface">url=</code>
          </li>
          <li>Stay signed in to Lyvora in Safari</li>
        </ol>
      </StepBlock>
    </div>
  );
}
