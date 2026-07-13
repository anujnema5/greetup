import { Radio } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  size?: "sm" | "md";
  className?: string;
};

export function OpenNowEmptyStateIcon({ size = "md", className }: Props) {
  return (
    <span
      className={cn(
        "mx-auto mb-2 flex shrink-0 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground/70",
        size === "sm" ? "size-8" : "size-10",
        className,
      )}
    >
      <Radio
        className={size === "sm" ? "size-3.5" : "size-[18px]"}
        strokeWidth={2}
        aria-hidden
      />
    </span>
  );
}
