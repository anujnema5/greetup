import { cn } from "@/lib/utils";

export function PageHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "border-b border-border px-4 py-4 md:min-h-[4.25rem] md:px-8 md:py-5",
        className,
      )}
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="h-5 w-28 animate-pulse rounded-md bg-muted dark:bg-muted/45" />
      <div className="mt-2 h-3.5 w-56 max-w-full animate-pulse rounded-md bg-muted/80 dark:bg-muted/35" />
    </div>
  );
}
