"use client";

import { EXPLORE } from "@/lib/copy/user-messages";
import { cn } from "@/lib/utils";

import type { BrowseNicheItem } from "../types/browse-niches.types";
import type { ExploreFilter } from "../types/explore-filter.types";
import { exploreFilterKey, isSameExploreFilter } from "../types/explore-filter.types";

type Props = {
  activeFilter: ExploreFilter;
  onFilterChange: (filter: ExploreFilter) => void;
  niches: readonly BrowseNicheItem[];
};

export function ExploreFilterChips({ activeFilter, onFilterChange, niches }: Props) {
  const chips: { filter: ExploreFilter; label: string; emoji?: string | null }[] = [
    { filter: "for-you", label: EXPLORE.filterForYou },
    { filter: "live-now", label: EXPLORE.filterLiveNow, emoji: "🔴" },
    ...niches.map((niche) => ({
      filter: { type: "niche" as const, nicheId: niche.id },
      label: niche.displayName,
      emoji: niche.emoji,
    })),
  ];

  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto pb-1",
        "snap-x snap-mandatory scroll-smooth [scrollbar-width:thin]",
      )}
      role="group"
      aria-label="Filter by category"
    >
      {chips.map(({ filter, label, emoji }) => {
        const active = isSameExploreFilter(activeFilter, filter);
        return (
          <button
            key={exploreFilterKey(filter)}
            type="button"
            aria-pressed={active}
            onClick={() => onFilterChange(filter)}
            className={cn(
              "inline-flex shrink-0 snap-start cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition-colors duration-150",
              "active:scale-[0.97]",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-border/80 hover:text-foreground",
            )}
          >
            {emoji ? (
              <span className="text-[15px] leading-none" aria-hidden>
                {emoji}
              </span>
            ) : null}
            {label}
          </button>
        );
      })}
    </div>
  );
}
