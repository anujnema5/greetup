"use client";

import { Loader2, UsersRound, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { TOUR_TARGETS } from "@/features/tour-guide";

type HeroActionCardsProps = {
  isSearching: boolean;
  matchDisabled: boolean;
  circleLoading: boolean;
  circleDisabled?: boolean;
  onFindMatch: () => void;
  onStartCircle: () => void;
};

export function HeroActionCards({
  isSearching,
  matchDisabled,
  circleLoading,
  circleDisabled,
  onFindMatch,
  onStartCircle,
}: HeroActionCardsProps) {
  return (
    <div className="flex w-full flex-col gap-2.5">
      <button
        type="button"
        data-tour-id={TOUR_TARGETS.matchOrb}
        disabled={matchDisabled || isSearching}
        onClick={onFindMatch}
        aria-busy={isSearching}
        aria-label={isSearching ? "Searching for a match" : "Find a match"}
        className={cn(
          "flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-border/70 bg-card p-3.5 text-left transition-colors duration-150",
          "hover:border-border hover:bg-muted/30",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
          "disabled:cursor-not-allowed disabled:opacity-60",
          isSearching && "border-primary/20 bg-primary/5",
        )}
      >
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary",
            isSearching && "bg-primary/18",
          )}
        >
          {isSearching ? (
            <Loader2 className="size-[18px] animate-spin" aria-hidden />
          ) : (
            <Video className="size-[18px]" strokeWidth={2} aria-hidden />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">
            {isSearching ? "Finding someone…" : "Find a match"}
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
            {isSearching ? "Usually takes a moment" : "Meet someone new on video"}
          </span>
        </span>
      </button>

      <button
        type="button"
        data-tour-id={TOUR_TARGETS.circleOrb}
        disabled={circleDisabled || circleLoading}
        onClick={onStartCircle}
        aria-label="Start a circle"
        className={cn(
          "flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-border/70 bg-card p-3.5 text-left transition-colors duration-150",
          "hover:border-border hover:bg-muted/30",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary-foreground dark:text-[oklch(82%_0.08_100)]">
          {circleLoading ? (
            <Loader2 className="size-[18px] animate-spin" aria-hidden />
          ) : (
            <UsersRound className="size-[18px]" strokeWidth={2} aria-hidden />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">Start a circle</span>
          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
            Host a small group hangout
          </span>
        </span>
      </button>
    </div>
  );
}
