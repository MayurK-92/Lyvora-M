import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * The design's scales use word-shaped names, which tailwind-merge cannot infer
 * from the CSS-first theme. Without them `text-headline-md` reads as a text
 * *colour* (so a following `text-primary` erases it) and `p-md` never overrides
 * a component's default `p-lg`.
 *
 * Keep in sync with packages/config/tailwind-theme.css.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        "display-lg",
        "headline-lg",
        "headline-lg-mobile",
        "headline-md",
        "body-lg",
        "body-md",
        "label-md",
        "label-sm",
      ],
      spacing: ["xs", "sm", "md", "lg", "xl", "2xl", "gutter", "unit"],
      container: [
        "xs",
        "sm",
        "md",
        "lg",
        "xl",
        "2xl",
        "3xl",
        "4xl",
        "5xl",
        "6xl",
        "7xl",
        "page",
      ],
    },
  },
});

/** Merges conditional class names and resolves Tailwind class conflicts (last one wins). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
