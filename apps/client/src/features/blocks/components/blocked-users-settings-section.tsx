"use client";

import { useState } from "react";
import { ChevronRight, ShieldBan } from "lucide-react";

import { useListBlockedUsers } from "../api/blocks.queries";
import { BlockedUsersDialog } from "./blocked-users-dialog";

function blockedCountLabel(count: number): string {
  if (count === 0) return "No one blocked";
  if (count === 1) return "1 person blocked";
  return `${count} people blocked`;
}

/** Compact settings row — opens a dialog to view and unblock users. */
export function BlockedUsersSettingsSection() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data, isLoading, isError } = useListBlockedUsers();
  const count = data?.items.length ?? 0;

  const subtitle = isLoading
    ? "Loading…"
    : isError
      ? "Could not load — tap to retry"
      : blockedCountLabel(count);

  return (
    <>
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left transition-colors hover:bg-muted/60 active:bg-muted/80 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        onClick={() => setDialogOpen(true)}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-muted-foreground">
          <ShieldBan className="h-4 w-4" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-semibold text-foreground">Blocked users</p>
            {!isLoading && !isError && count > 0 ? (
              <span className="inline-flex items-center rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground">
                {count}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
            {subtitle}
          </p>
        </div>

        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" aria-hidden />
      </button>

      <BlockedUsersDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
