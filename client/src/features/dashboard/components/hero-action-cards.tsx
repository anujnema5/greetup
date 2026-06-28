"use client";

import { Loader2, UsersRound, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { TOUR_TARGETS } from "@/features/tour-guide";

type MatchIntent = "quick" | "activity";

type HeroActionCardsProps = {
  isSearching: boolean;
  searchingIntent: MatchIntent | null;
  switchingToIntent: MatchIntent | null;
  matchDisabled: boolean;
  spaceLoading: boolean;
  spaceDisabled?: boolean;
  onQuickMatch: () => void;
  onActivityMatch: () => void;
  onStartSpace: () => void;
};

function isQuickActive(searchingIntent: MatchIntent | null) {
  return searchingIntent === "quick";
}

function isActivityActive(searchingIntent: MatchIntent | null) {
  return searchingIntent === "activity";
}

const actionButtonClass =
  "flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-border/70 bg-card p-3.5 text-left transition-colors duration-150 hover:border-border hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60";

export function HeroActionCards({
  isSearching,
  searchingIntent,
  switchingToIntent,
  matchDisabled,
  spaceLoading,
  spaceDisabled,
  onQuickMatch,
  onActivityMatch,
  onStartSpace,
}: HeroActionCardsProps) {
  const quickActive = isQuickActive(searchingIntent);
  const activityActive = isActivityActive(searchingIntent);
  const quickSwitching = switchingToIntent === "quick";
  const activitySwitching = switchingToIntent === "activity";
  const modeSwitchBusy = switchingToIntent !== null;

  const quickShowSpinner = quickActive || quickSwitching;
  const activityShowSpinner = activityActive || activitySwitching;

  const quickIsSwitch =
    isSearching && !quickActive && searchingIntent === "activity" && !quickSwitching;
  const activityIsSwitch =
    isSearching && !activityActive && searchingIntent === "quick" && !activitySwitching;

  return (
    <div className="flex w-full flex-col gap-2.5">
      <button
        type="button"
        data-tour-id={TOUR_TARGETS.matchOrb}
        disabled={matchDisabled || modeSwitchBusy}
        onClick={onQuickMatch}
        aria-busy={quickShowSpinner}
        aria-label={
          quickIsSwitch ? "Switch to quick match" : quickActive ? "Quick match in progress" : "Quick match"
        }
        className={cn(actionButtonClass, quickActive && "border-primary/20 bg-primary/5")}
      >
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary",
            quickActive && "bg-primary/18",
          )}
        >
          {quickShowSpinner ? (
            <Loader2 className="size-[18px] animate-spin" aria-hidden />
          ) : (
            <Video className="size-[18px]" strokeWidth={2} aria-hidden />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">
            {quickIsSwitch ? "Switch to quick match" : "Quick match"}
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
            {quickIsSwitch
              ? "Opens preferences — activities optional"
              : quickActive
                ? "Finding someone for you"
                : "Find anyone based on your vibe"}
          </span>
        </span>
      </button>

      <button
        type="button"
        disabled={matchDisabled || modeSwitchBusy}
        onClick={onActivityMatch}
        aria-busy={activityShowSpinner}
        aria-label={
          activityIsSwitch
            ? "Switch to activity match"
            : activityActive
              ? "Activity match in progress"
              : "Match by activity"
        }
        className={cn(actionButtonClass, activityActive && "border-primary/20 bg-primary/5")}
      >
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary-foreground",
            activityActive && "bg-primary/18 text-primary",
          )}
        >
          {activityShowSpinner ? (
            <Loader2 className="size-[18px] animate-spin" aria-hidden />
          ) : (
            <Video className="size-[18px]" strokeWidth={2} aria-hidden />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">
            {activityIsSwitch ? "Switch to activity match" : "Match by activity"}
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
            {activityIsSwitch
              ? "Opens preferences — activity required"
              : activityActive
                ? "Finding someone for you"
                : "Chess, language practice, study, and more"}
          </span>
        </span>
      </button>

      <button
        type="button"
        data-tour-id={TOUR_TARGETS.spaceOrb}
        disabled={spaceDisabled || spaceLoading || modeSwitchBusy}
        onClick={onStartSpace}
        aria-label="Start a space"
        className={actionButtonClass}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary-foreground dark:text-[oklch(82%_0.08_100)]">
          {spaceLoading ? (
            <Loader2 className="size-[18px] animate-spin" aria-hidden />
          ) : (
            <UsersRound className="size-[18px]" strokeWidth={2} aria-hidden />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">Start a space</span>
          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
            Host a small group hangout
          </span>
        </span>
      </button>
    </div>
  );
}
