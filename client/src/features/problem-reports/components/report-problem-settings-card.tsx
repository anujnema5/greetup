"use client";

import { useState } from "react";
import { ChevronRight, MessageSquareWarning } from "lucide-react";

import { ReportProblemModal } from "./report-problem-modal";

/** Settings row — opens the report modal (app surface). */
export function ReportProblemSettingsCard() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left transition-colors hover:bg-muted/60 active:bg-muted/80 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        onClick={() => setOpen(true)}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-muted-foreground">
          <MessageSquareWarning className="h-4 w-4" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-foreground">Report a problem</p>
          <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
            Found a bug or something not working? Let us know.
          </p>
        </div>

        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" aria-hidden />
      </button>

      <ReportProblemModal open={open} onOpenChange={setOpen} surface="app" />
    </>
  );
}
