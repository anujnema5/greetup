import { PageHeaderSkeleton } from "@/features/app-shell/components/page-header-skeleton";

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted/90 dark:bg-muted/35 ${className ?? ""}`}
    />
  );
}

function ConversationRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <SkeletonBlock className="h-10 w-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <SkeletonBlock className="h-3.5 w-28 max-w-[70%]" />
        <SkeletonBlock className="h-3 w-40 max-w-[85%]" />
      </div>
    </div>
  );
}

export function MessagesPageSkeleton() {
  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden pb-16 md:pb-0">
      <PageHeaderSkeleton />

      <div className="flex min-h-0 flex-1 flex-col px-3 py-3 md:px-6 md:py-5">
        <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card/40 shadow-sm dark:bg-card/25">
          <aside className="flex min-h-0 w-full shrink-0 flex-col border-border bg-card/70 md:w-[min(100%,23rem)] md:border-r md:bg-card/50">
            <div className="border-b border-border px-4 py-3 md:min-h-[4.25rem]">
              <SkeletonBlock className="h-4 w-16" />
              <SkeletonBlock className="mt-2 h-3 w-44" />
            </div>
            <SkeletonBlock className="mx-4 mt-3 h-11 rounded-xl" />
            <div className="mt-2 flex flex-col">
              {Array.from({ length: 7 }).map((_, index) => (
                <ConversationRowSkeleton key={index} />
              ))}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
