"use client";

import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  variant?: "main" | "panel";
};

export function SectionHeader({
  title,
  actionLabel,
  onAction,
  className,
  variant = "main",
}: SectionHeaderProps) {
  const showAction = Boolean(actionLabel && onAction);

  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <h2
        className={cn(
          "font-semibold text-foreground",
          variant === "main"
            ? "text-base tracking-tight"
            : "text-sm font-medium text-foreground/85",
        )}
      >
        {title}
      </h2>
      {showAction ? (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex shrink-0 cursor-pointer items-center gap-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          {actionLabel}
          <ChevronRight className="size-3.5 opacity-70" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
