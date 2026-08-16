import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-label-sm font-semibold",
  {
    variants: {
      tone: {
        neutral: "bg-surface-container text-on-surface-variant",
        secondary: "bg-secondary-container text-on-secondary-container",
        primary: "bg-primary text-on-primary",
        error: "bg-error-container text-on-error-container",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, className }))} {...props} />;
}

export { badgeVariants };
