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
    <div className="flex h-10 w-full items-center gap-3 rounded-xl border border-border/80 bg-background/60 px-3">
      <SkeletonBlock className="size-4 shrink-0 rounded-sm bg-muted dark:bg-muted/50" />
      <SkeletonBlock className="h-3.5 w-[42%] max-w-40 rounded-md bg-muted/80 dark:bg-muted/40" />
    </div>
  );
}

/** Same shell as a loaded connection card. */
export function ConnectionRowSkeleton() {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2.5">
      <div className="size-10 shrink-0 animate-pulse rounded-full bg-muted dark:bg-muted/45" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-3.5 w-28 max-w-[70%] animate-pulse rounded bg-muted/85 dark:bg-muted/40" />
        <div className="h-3 w-16 max-w-[45%] animate-pulse rounded bg-muted/75 dark:bg-muted/30" />
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="size-7 animate-pulse rounded-lg bg-muted/80 dark:bg-muted/35" />
        ))}
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
          <div className="flex gap-2">
            <SkeletonBlock className="h-7 w-24 rounded-full bg-muted dark:bg-muted/45" />
            <SkeletonBlock className="h-7 w-20 rounded-full bg-muted/85 dark:bg-muted/35" />
          </div>
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
