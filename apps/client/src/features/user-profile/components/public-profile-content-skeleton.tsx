import { cn } from "@/lib/utils";

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted/50", className)} />;
}

type PublicProfileContentSkeletonProps = {
  className?: string;
  /** When embedded in connections split panel, content stays column-width. */
  compact?: boolean;
};

/** Mirrors the loaded public profile layout. */
export function PublicProfileContentSkeleton({
  className,
  compact = false,
}: PublicProfileContentSkeletonProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-5",
        compact ? "max-w-none" : "max-w-lg md:max-w-xl",
        className,
      )}
      aria-busy="true"
      aria-label="Loading profile"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <SkeletonBlock className="h-24 w-24 rounded-full" />
        <SkeletonBlock className="h-5 w-36" />
        <SkeletonBlock className="h-3.5 w-24" />
        <SkeletonBlock className="h-3 w-20" />
      </div>

      <SkeletonBlock className="h-10 w-full rounded-xl" />

      <div className="flex gap-2">
        <SkeletonBlock className="h-11 w-full min-w-0 flex-1 rounded-xl" />
        <SkeletonBlock className="h-11 w-11 shrink-0 rounded-xl" />
        <SkeletonBlock className="h-11 w-11 shrink-0 rounded-xl" />
        <SkeletonBlock className="h-11 w-11 shrink-0 rounded-xl" />
      </div>

      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="space-y-3 rounded-2xl border border-border bg-card/40 px-4 py-4"
        >
          <SkeletonBlock className="h-3 w-20" />
          {i === 2 ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 3 }).map((__, j) => (
                <SkeletonBlock key={j} className="h-7 w-[5.5rem] rounded-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <SkeletonBlock className="h-3 w-full" />
              <SkeletonBlock className="h-3 w-[88%]" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
