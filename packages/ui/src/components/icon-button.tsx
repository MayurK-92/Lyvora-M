import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";
import { MaterialIcon, type IconName } from "./icon";

const iconButtonVariants = cva(
  "inline-flex items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        ghost: "text-on-surface-variant hover:text-on-surface",
        soft: "bg-surface-container text-on-surface-variant hover:bg-surface-container-high",
        surface:
          "bg-surface-container-low text-on-surface-variant shadow-md hover:bg-surface-container hover:text-on-surface",
        primary: "bg-primary text-on-primary hover:bg-primary-container",
      },
      size: {
        sm: "size-8",
        md: "size-10",
      },
    },
    defaultVariants: { variant: "ghost", size: "md" },
  },
);

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  icon: IconName;
  /** Accessible name — icon-only controls have no visible text. */
  label: string;
  iconSize?: number;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, iconSize = 20, variant, size, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(iconButtonVariants({ variant, size, className }))}
      {...props}
    >
      <MaterialIcon name={icon} size={iconSize} />
    </button>
  ),
);
IconButton.displayName = "IconButton";

export { iconButtonVariants };
