import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";
import { MaterialIcon, type IconName } from "./icon";

const chipVariants = cva(
  "inline-flex w-max items-center gap-xs rounded-full transition-colors",
  {
    variants: {
      tone: {
        neutral: "bg-surface-container-high text-on-surface",
        outline: "border border-outline-variant/50 bg-surface-container-low text-on-surface-variant",
        primary: "bg-primary/10 text-primary",
        primaryContainer: "bg-primary-container text-on-primary-container",
        secondary: "bg-secondary-container/30 text-secondary",
        secondaryContainer: "bg-secondary-container text-on-secondary-container",
        tertiary: "bg-tertiary/10 text-tertiary",
        tertiaryContainer: "bg-tertiary-container/10 text-tertiary-container",
        error: "bg-error-container text-on-error-container",
        transparent: "text-on-surface-variant",
      },
      size: {
        sm: "px-2 py-1 text-label-sm",
        md: "px-sm py-xs text-label-md",
      },
      interactive: {
        true: "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  },
);

type ChipOwnProps = VariantProps<typeof chipVariants> & {
  icon?: IconName;
  /** Small color dot instead of an icon — used by the graph filters and report legend. */
  dotClassName?: string;
  children: React.ReactNode;
};

export type ChipProps = ChipOwnProps &
  Omit<React.HTMLAttributes<HTMLSpanElement>, keyof ChipOwnProps>;

export function Chip({
  icon,
  dotClassName,
  tone,
  size,
  interactive,
  className,
  children,
  ...props
}: ChipProps) {
  return (
    <span
      className={cn(chipVariants({ tone, size, interactive, className }))}
      {...props}
    >
      {dotClassName && (
        <span aria-hidden="true" className={cn("size-2 rounded-full", dotClassName)} />
      )}
      {icon && <MaterialIcon name={icon} size={16} />}
      {children}
    </span>
  );
}

export type ChipButtonProps = ChipOwnProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ChipOwnProps>;

export const ChipButton = React.forwardRef<HTMLButtonElement, ChipButtonProps>(
  ({ icon, dotClassName, tone, size, className, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(chipVariants({ tone, size, interactive: true, className }))}
      {...props}
    >
      {dotClassName && (
        <span aria-hidden="true" className={cn("size-2 rounded-full", dotClassName)} />
      )}
      {icon && <MaterialIcon name={icon} size={16} />}
      {children}
    </button>
  ),
);
ChipButton.displayName = "ChipButton";

export { chipVariants };
