"use client";

import { useEffect } from "react";

/**
 * Replaces the root layout when rendering itself fails, so it must ship its own
 * <html>/<body> and cannot import globals.css — a CSS compile failure would
 * otherwise take this fallback down too ("missing required error components").
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 16,
          textAlign: "center",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
          background: "#fbf8fc",
          color: "#1b1b1e",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.25, fontWeight: 600 }}>
          Lyvora hit a snag
        </h1>
        <p
          style={{
            margin: 0,
            maxWidth: 28 * 16,
            fontSize: 16,
            lineHeight: 1.5,
            color: "#45464e",
          }}
        >
          An unexpected error stopped the app from loading. Your saved memories are
          safe.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            border: 0,
            borderRadius: 9999,
            padding: "8px 24px",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            background: "#182442",
            color: "#ffffff",
          }}
        >
          Reload Lyvora
        </button>
      </body>
    </html>
  );
}
