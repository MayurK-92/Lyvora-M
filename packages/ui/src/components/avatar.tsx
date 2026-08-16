import * as React from "react";
import { cn } from "../lib/cn";

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  src?: string | null;
  /** Used for the alt text and to derive initials when there is no image. */
  name: string;
  size?: number;
}

function initialsOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const local = trimmed.split("@")[0] ?? trimmed;
  const parts = local.split(/[.\s_-]+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0] ?? "");
  return (letters.join("") || local[0] || "?").toUpperCase();
}

export function Avatar({ src, name, size = 32, className, ...props }: AvatarProps) {
  const dimension = { width: size, height: size };

  if (src) {
    // Plain <img>: avatars come from arbitrary identity-provider hosts, so
    // next/image would need an open remotePatterns allowlist.
    return (
      <img
        src={src}
        alt={name}
        style={dimension}
        className={cn(
          "shrink-0 rounded-full border border-outline-variant object-cover",
          className,
        )}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={name}
      style={{ ...dimension, fontSize: Math.round(size * 0.4) }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-outline-variant bg-secondary-container font-semibold text-on-secondary-container",
        className,
      )}
      {...props}
    >
      {initialsOf(name)}
    </span>
  );
}
