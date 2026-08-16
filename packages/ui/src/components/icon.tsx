import * as React from "react";
import { cn } from "../lib/cn";

/**
 * Every Material Symbols ligature used across docs/UI DESIGN. Keeping this a
 * closed union means a typo becomes a type error instead of a blank glyph.
 */
export const ICON_NAMES = [
  "add",
  "arrow_back",
  "arrow_forward",
  "arrow_upward",
  "article",
  "attach_file",
  "auto_awesome",
  "bar_chart",
  "blender",
  "book",
  "bookmark",
  "business_center",
  "calendar_month",
  "category",
  "check_circle",
  "chevron_right",
  "close",
  "code",
  "content_copy",
  "cooking",
  "delete",
  "description",
  "devices",
  "done",
  "download",
  "draw",
  "edit",
  "edit_note",
  "error",
  "expand_more",
  "filter_list",
  "fit_screen",
  "fitness_center",
  "flight_takeoff",
  "folder",
  "forum",
  "health_and_safety",
  "history",
  "home",
  "hub",
  "image",
  "kitchen",
  "library_books",
  "lightbulb",
  "link",
  "lock",
  "logout",
  "menu",
  "memory",
  "mic",
  "more_horiz",
  "movie",
  "notifications",
  "open_in_new",
  "palette",
  "payments",
  "person",
  "picture_as_pdf",
  "psychology",
  "public",
  "refresh",
  "remove",
  "restaurant",
  "restaurant_menu",
  "save",
  "school",
  "search",
  "send",
  "settings",
  "share",
  "shopping_bag",
  "smart_toy",
  "sync",
  "task_alt",
  "terminal",
  "thumb_down",
  "thumb_up",
  "touch_app",
  "track_changes",
  "tune",
  "upload_file",
  "visibility",
  "work",
] as const;

export type IconName = (typeof ICON_NAMES)[number];

export interface MaterialIconProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  name: IconName;
  /** Optical size in px. The design uses 14–24 depending on context. */
  size?: number;
  filled?: boolean;
}

/**
 * Renders a Material Symbols Outlined ligature, matching the
 * `<span class="material-symbols-outlined">` pattern used throughout the design.
 */
export function MaterialIcon({
  name,
  size,
  filled = false,
  className,
  style,
  ...props
}: MaterialIconProps) {
  return (
    <span
      aria-hidden="true"
      data-filled={filled ? "true" : undefined}
      className={cn("material-symbols-outlined", className)}
      style={size ? { fontSize: `${size}px`, ...style } : style}
      {...props}
    >
      {name}
    </span>
  );
}
