"use client";

import ReactMarkdown from "react-markdown";
import { cn } from "@lyvora/ui";

/**
 * Renders assistant replies as Markdown so **bold**, lists, and paragraphs
 * show as intended instead of raw asterisks.
 */
export function ChatMarkdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={cn("text-body-md text-on-surface", className)}>
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <p className="mb-sm last:mb-0 leading-relaxed">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mb-sm list-disc space-y-xs pl-md last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-sm list-decimal space-y-xs pl-md last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-on-surface">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded bg-surface-container px-1 py-0.5 text-[0.9em]">
              {children}
            </code>
          ),
          h1: ({ children }) => (
            <h3 className="mb-sm text-headline-md text-on-surface">{children}</h3>
          ),
          h2: ({ children }) => (
            <h3 className="mb-sm text-headline-md text-on-surface">{children}</h3>
          ),
          h3: ({ children }) => (
            <h4 className="mb-xs text-label-md font-semibold text-on-surface">
              {children}
            </h4>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
