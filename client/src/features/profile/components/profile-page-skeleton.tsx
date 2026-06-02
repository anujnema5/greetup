import { PageHeaderSkeleton } from "@/features/app-shell/components/page-header-skeleton";

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted/90 dark:bg-muted/35 ${className ?? ""}`}
    />
  );
}

export function ProfilePageSkeleton() {
  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
      <PageHeaderSkeleton />

      <div className="flex flex-col gap-5 px-4 py-5 md:px-8">
        <SkeletonBlock className="h-24 w-full rounded-2xl" />

        <div className="overflow-hidden rounded-3xl border border-border bg-card p-5">
          <div className="flex items-start gap-4">
            <SkeletonBlock className="h-24 w-24 shrink-0 rounded-2xl md:h-28 md:w-28" />
            <div className="min-w-0 flex-1 space-y-2 pt-1">
              <SkeletonBlock className="h-5 w-40" />
              <SkeletonBlock className="h-4 w-28" />
              <SkeletonBlock className="h-4 w-52 max-w-full" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-14 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </main>
  );
}
