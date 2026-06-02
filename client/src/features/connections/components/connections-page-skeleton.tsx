import { cn } from "@/lib/utils";

import { ConnectionsListSkeleton } from "./connections-skeletons";
import { CONNECTIONS_LIST_COLUMN_CLASS } from "../lib/connections-layout";
import { PageHeaderSkeleton } from "@/features/app-shell/components/page-header-skeleton";

export function ConnectionsPageSkeleton() {
  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden pb-16 md:pb-0">
      <PageHeaderSkeleton />

      <div className="flex min-h-0 flex-1 flex-col px-3 py-3 md:px-6 md:py-5">
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card/40 shadow-sm",
            "md:flex-row md:items-stretch dark:bg-card/25",
          )}
        >
          <aside
            className={cn(
              "flex min-h-0 min-w-0 flex-col overflow-y-auto px-1 py-1 md:px-4 md:py-4",
              CONNECTIONS_LIST_COLUMN_CLASS,
            )}
          >
            <ConnectionsListSkeleton variant="page" pageLayout="centered" />
          </aside>
        </div>
      </div>
    </main>
  );
}
