import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

const surfaceVariants = cva("relative overflow-hidden", {
  variants: {
    variant: {
      /** home_lyvora memory card — soft diffused shadow that deepens on hover. */
      elevated:
        "bg-surface shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]",
      /** search_lyvora result card — hairline outline over the lowest surface. */
      outlined:
        "bg-surface-container-lowest border border-outline-variant/30 shadow-sm transition-shadow hover:shadow-md",
      /** memory_detail / report panels — flat lowest surface. */
      lowest: "bg-surface-container-lowest shadow-sm",
      /** chat suggestions, rediscover tiles — tonal fill. */
      filled: "bg-surface-container-low shadow-sm",
      /** report "Forgotten Gems" — inset tonal panel. */
      inset: "bg-surface-container border border-outline-variant/20 shadow-inner",
      plain: "",
    },
    radius: {
      lg: "rounded-lg",
      xl: "rounded-xl",
      "2xl": "rounded-2xl",
      "3xl": "rounded-3xl",
    },
  },
  defaultVariants: { variant: "elevated", radius: "xl" },
});

export interface SurfaceProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof surfaceVariants> {}

export function Card({ className, variant, radius, ...props }: SurfaceProps) {
  return <div className={cn(surfaceVariants({ variant, radius, className }))} {...props} />;
}

/**
 * The 4px category-coded rail on the far left edge of every memory surface.
 * See DESIGN.md § Components → Memory Cards.
 */
export function AccentStripe({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      aria-hidden="true"
      className={cn("absolute inset-y-0 left-0 w-1", className)}
      {...props}
    />
  );
}

export { surfaceVariants };
