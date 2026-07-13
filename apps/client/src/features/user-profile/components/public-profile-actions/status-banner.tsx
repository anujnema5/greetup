import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type StatusBannerProps = {
  tone: "amber" | "emerald" | "muted";
  icon: ReactNode;
  label: string;
  trailing?: ReactNode;
  /** Inline pill — for short labels like "Connected". */
  compact?: boolean;
  className?: string;
};

const toneClasses = {
  amber: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-100",
  emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-100",
  muted: "border-border bg-muted/50 text-muted-foreground",
} as const;

const iconToneClasses = {
  amber: "text-amber-600 dark:text-amber-200",
  emerald: "text-emerald-600 dark:text-emerald-200",
  muted: "text-muted-foreground",
} as const;

export function PublicProfileStatusBanner({
  tone,
  icon,
  label,
  trailing,
  compact = false,
  className,
}: StatusBannerProps) {
  return (
    <div
      className={cn(
        "flex items-center border",
        compact
          ? "w-fit shrink-0 gap-1.5 rounded-full px-2.5 py-1"
          : "gap-2 rounded-xl px-3 py-2.5",
        toneClasses[tone],
        className,
      )}
    >
      <span className={cn("shrink-0", iconToneClasses[tone])}>{icon}</span>
      <p
        className={cn(
          "font-medium",
          compact ? "text-xs" : "min-w-0 flex-1 text-sm",
        )}
      >
        {label}
      </p>
      {trailing}
    </div>
  );
}
