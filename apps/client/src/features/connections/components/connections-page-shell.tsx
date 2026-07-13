"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ConnectionsPageShellProps = {
  list: ReactNode;
  detail: ReactNode;
  className?: string;
};

export function ConnectionsPageShell({
  list,
  detail,
  className,
}: ConnectionsPageShellProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card/40 shadow-sm dark:bg-card/25",
        className,
      )}
    >
      <aside className="flex min-h-0 min-w-0 w-full max-w-full shrink-0 flex-col overflow-y-auto border-r border-border bg-card/70 md:w-[min(100%,26rem)] md:bg-card/50">
        <div className="flex min-h-0 flex-1 flex-col p-2 md:p-3">{list}</div>
      </aside>

      <section className="hidden min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-muted/25 md:flex dark:bg-black/45">
        {detail}
      </section>
    </div>
  );
}
