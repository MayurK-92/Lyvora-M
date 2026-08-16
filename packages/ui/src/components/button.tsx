import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-xs whitespace-nowrap font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-on-primary shadow-sm hover:bg-primary-container hover:text-on-primary-container",
        tonal:
          "bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed-dim",
        outline:
          "border border-primary bg-transparent text-primary hover:bg-primary/5",
        soft: "bg-surface-container text-on-surface hover:bg-surface-container-highest",
        ghost:
          "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
        link: "text-primary underline-offset-4 hover:underline",
        destructive: "bg-error text-on-error hover:bg-error/90",
      },
      size: {
        sm: "px-3 py-1.5 text-label-sm",
        md: "px-4 py-2 text-label-md",
        lg: "px-lg py-sm text-label-md",
        xl: "px-lg py-md text-label-md",
        icon: "size-10 p-0",
      },
      shape: {
        pill: "rounded-full",
        rounded: "rounded-lg",
        xl: "rounded-xl",
      },
      block: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      shape: "pill",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, shape, block, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, shape, block, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
