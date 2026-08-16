"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/cn";
import { IconButton } from "./icon-button";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Portaled modal. Critical layout (position, z-index, max-width, padding) uses
 * inline styles so missing Tailwind utilities (e.g. z-[100]) cannot drop the
 * panel under the app chrome or clip it under the sidebar.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: DialogProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    const frame = window.requestAnimationFrame(() => panelRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        aria-hidden="true"
        onClick={onClose}
        className="bg-inverse-surface/40 backdrop-blur-sm"
        style={{ position: "absolute", inset: 0 }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "relative flex w-full flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-[0_10px_30px_rgba(0,0,0,0.12)] outline-none",
          className,
        )}
        style={{ zIndex: 1, maxWidth: 420, maxHeight: "90vh" }}
      >
        <div className="flex items-start gap-3" style={{ padding: "24px 24px 0" }}>
          <div className="min-w-0 flex-1 overflow-hidden">
            <h2
              id={titleId}
              className="break-words text-headline-md text-on-surface"
            >
              {title}
            </h2>
          </div>
          <IconButton
            icon="close"
            label="Close"
            onClick={onClose}
            size="sm"
            className="shrink-0"
          />
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto"
          style={{ padding: "16px 24px" }}
        >
          {description && (
            <p
              id={descriptionId}
              className="break-words text-body-md text-on-surface-variant"
            >
              {description}
            </p>
          )}
          {children ? <div className={description ? "mt-3" : undefined}>{children}</div> : null}
        </div>

        {footer && (
          <div
            className="flex flex-wrap items-center justify-end gap-2 border-t border-outline-variant/20"
            style={{ padding: "16px 24px" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
