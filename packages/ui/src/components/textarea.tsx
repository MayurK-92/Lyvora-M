"use client";

import * as React from "react";
import { cn } from "../lib/cn";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Grow with content up to `maxHeight` px, as the chat composer does. */
  autoGrow?: boolean;
  maxHeight?: number;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoGrow = false, maxHeight = 150, value, onChange, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

    const resize = React.useCallback(() => {
      const node = innerRef.current;
      if (!autoGrow || !node) return;
      node.style.height = "auto";
      node.style.height = `${Math.min(node.scrollHeight, maxHeight)}px`;
    }, [autoGrow, maxHeight]);

    React.useLayoutEffect(resize, [resize, value]);

    return (
      <textarea
        ref={(node) => {
          innerRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        value={value}
        onChange={(event) => {
          onChange?.(event);
          resize();
        }}
        style={autoGrow ? { maxHeight: `${maxHeight}px` } : undefined}
        className={cn(
          "w-full resize-none rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm text-body-md text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";
