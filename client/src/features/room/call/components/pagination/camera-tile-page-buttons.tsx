"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const PANEL_BTN =
  "flex h-8 w-8 items-center justify-center rounded-full border border-border/80 bg-muted/40 text-foreground transition hover:bg-muted/70";

export type CameraTilePageButtonsProps = {
  currentPage: number;
  totalPages: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  /** `peoplePanel` = right sidebar; `underScreenShare` = dark bar under shared screen. */
  look: "peoplePanel" | "underScreenShare";
  /** For screen-reader labels only. */
  what?: string;
};

export function CameraTilePageButtons({
  currentPage,
  totalPages,
  onPreviousPage,
  onNextPage,
  look,
  what = "cameras",
}: CameraTilePageButtonsProps) {
  const maxPage = Math.max(0, totalPages - 1);
  const onFirstPage = currentPage <= 0;
  const onLastPage = currentPage >= maxPage;

  if (look === "peoplePanel") {
    return (
      <div className="flex shrink-0 items-center justify-center gap-2 pt-0.5">
        <button
          type="button"
          onClick={onPreviousPage}
          disabled={onFirstPage}
          aria-label="Previous camera page"
          className={cn(PANEL_BTN, onFirstPage && "pointer-events-none opacity-40")}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <span className="min-w-13 text-center text-[11px] tabular-nums text-muted-foreground">
          {currentPage + 1} / {totalPages}
        </span>
        <button
          type="button"
          onClick={onNextPage}
          disabled={onLastPage}
          aria-label="Next camera page"
          className={cn(PANEL_BTN, onLastPage && "pointer-events-none opacity-40")}
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full shrink-0 items-center justify-between gap-2 px-0.5 md:px-1">
      <button
        type="button"
        onClick={onPreviousPage}
        disabled={onFirstPage}
        aria-label={`Previous ${what}, page ${currentPage + 1} of ${totalPages}`}
        className={cn(
          "flex h-8 min-w-8 items-center justify-center rounded-md border border-white/15 bg-white/10 px-2 text-[11px] font-medium text-white transition hover:bg-white/20 md:h-9",
          onFirstPage && "pointer-events-none opacity-30",
        )}
      >
        <span className="inline-flex items-center gap-0.5">
          <ChevronLeft size={18} className="shrink-0" />
          <span className="hidden sm:inline">Prev</span>
        </span>
      </button>
      <span className="sr-only">
        Page {currentPage + 1} of {totalPages}
      </span>
      <button
        type="button"
        onClick={onNextPage}
        disabled={onLastPage}
        aria-label={`Next ${what}, page ${currentPage + 1} of ${totalPages}`}
        className={cn(
          "flex h-8 min-w-8 items-center justify-center rounded-md border border-white/15 bg-white/10 px-2 text-[11px] font-medium text-white transition hover:bg-white/20 md:h-9",
          onLastPage && "pointer-events-none opacity-30",
        )}
      >
        <span className="inline-flex items-center gap-0.5">
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={18} className="shrink-0" />
        </span>
      </button>
    </div>
  );
}
