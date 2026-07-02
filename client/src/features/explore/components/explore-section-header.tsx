"use client";

import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type ExploreSectionHeaderProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

export function ExploreSectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  className,
}: ExploreSectionHeaderProps) {
  const showAction = Boolean(actionLabel && onAction);

  return (
    <header className={cn("mb-4 flex items-start justify-between gap-3", className)}>
      <div className="min-w-0 space-y-1">
        <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
        {subtitle ? (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
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
    </header>
  );
}
