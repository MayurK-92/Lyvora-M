import type { ReactNode } from "react";
import { cn } from "@lyvora/ui";

/**
 * The `px-md md:px-xl py-lg max-w-container-max mx-auto` wrapper the design
 * puts around every scrollable page body.
 */
export function PageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-page px-md py-lg md:px-xl", className)}>
      {children}
    </div>
  );
}
