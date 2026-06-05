import type { ConnectionsPageListLayout } from "../lib/connections-layout";
import { cn } from "@/lib/utils";

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/90 dark:bg-muted/35",
        className,
      )}
    />
  );
}

/** Matches the page search input shell. */
function ConnectionsSearchSkeleton() {
  return (
    <div className="flex h-11 w-full items-center gap-3 rounded-xl border border-border bg-card px-3 shadow-sm">
      <SkeletonBlock className="h-4 w-4 shrink-0 rounded-sm bg-muted dark:bg-muted/50" />
      <SkeletonBlock className="h-3.5 w-[42%] max-w-40 rounded-md bg-muted/80 dark:bg-muted/40" />
    </div>
  );
}

/** Same shell as a loaded connection card. */
export function ConnectionRowSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        <SkeletonBlock className="h-10 w-10 shrink-0 rounded-full bg-muted dark:bg-muted/45" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonBlock className="h-3.5 w-28 max-w-[70%] bg-muted/85 dark:bg-muted/40" />
          <SkeletonBlock className="h-3 w-16 max-w-[45%] bg-muted/75 dark:bg-muted/30" />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-8 w-8 rounded-lg bg-muted/80 dark:bg-muted/35" />
          ))}
        </div>
        <SkeletonBlock className="h-8 w-17 shrink-0 rounded-xl bg-muted/80 dark:bg-muted/35" />
      </div>
    </div>
  );
}

type ConnectionsListSkeletonProps = {
  variant?: "page" | "profile";
  pageLayout?: ConnectionsPageListLayout;
  className?: string;
};

/** Left-aligned list skeleton — width comes from the page aside wrapper. */
export function ConnectionsListSkeleton({
  variant = "page",
  pageLayout = "centered",
  className,
}: ConnectionsListSkeletonProps) {
  const rowCount = variant === "page" ? (pageLayout === "split" ? 6 : 5) : 3;

  return (
    <div
      className={cn("flex w-full max-w-full flex-col gap-4 min-w-0", className)}
      aria-busy="true"
      aria-label="Loading connections"
    >
      {variant === "page" ? (
        <>
          <SkeletonBlock className="h-3.5 w-28 bg-muted dark:bg-muted/45" />
          <ConnectionsSearchSkeleton />
        </>
      ) : (
        <div className="space-y-1.5">
          <SkeletonBlock className="h-4 w-24 bg-muted dark:bg-muted/45" />
          <SkeletonBlock className="h-3 w-16 bg-muted/85 dark:bg-muted/35" />
        </div>
      )}

      <div className="flex flex-col gap-2">
        {Array.from({ length: rowCount }, (_, i) => (
          <ConnectionRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
