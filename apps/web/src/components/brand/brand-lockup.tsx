import Image from "next/image";
import { cn } from "@lyvora/ui";

/**
 * The design's mark + wordmark pairing, shared by the sidebar, mobile top bar,
 * auth screens and the marketing header so the lockup stays identical.
 */
export function BrandLockup({
  size = 32,
  className,
  wordmarkClassName,
}: {
  size?: number;
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-sm", className)}>
      <Image
        src="/brand/lyvora-mark.png"
        alt=""
        width={size}
        height={size}
        priority
        style={{ height: size, width: "auto" }}
        className="object-contain"
      />
      <span
        className={cn("text-headline-md tracking-tight text-primary", wordmarkClassName)}
      >
        Lyvora
      </span>
    </span>
  );
}
