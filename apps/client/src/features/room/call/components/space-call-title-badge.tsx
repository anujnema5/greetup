"use client";

import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

type SpaceCallTitleBadgeProps = {
  title: string;
  canEdit?: boolean;
  onEdit?: () => void;
  className?: string;
};

/** Compact circle name chip — matches `TileNameBadge` chrome, minimal stage footprint. */
export function SpaceCallTitleBadge({
  title,
  canEdit = false,
  onEdit,
  className,
}: SpaceCallTitleBadgeProps) {
  return (
    <div
      className={cn(
        "pointer-events-auto flex min-w-0 max-w-[min(100%,12rem)] items-center gap-0.5 rounded-md border border-border/70",
        "bg-card/90 py-0.5 pl-2 shadow-sm backdrop-blur-sm sm:max-w-[16rem]",
        canEdit && onEdit ? "pr-0.5" : "pr-2",
        className,
      )}
    >
      <p
        className="min-w-0 flex-1 truncate text-[11px] font-semibold text-foreground md:text-xs"
        title={title}
      >
        {title}
      </p>
      {canEdit && onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          aria-label="Rename space"
          title="Rename space"
          className="inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <Pencil className="size-3" strokeWidth={2.25} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
