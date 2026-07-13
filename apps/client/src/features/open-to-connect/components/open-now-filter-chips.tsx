"use client";

import { OPEN_NOW_PAGE } from "@/lib/copy/user-messages";
import { cn } from "@/lib/utils";

import type { OpenNowFilterChip } from "../hooks/use-open-now-filter-chips";
import type { OpenNowFeedFilter } from "../types/open-now-filter.types";
import { isSameOpenNowFilter, openNowFilterKey } from "../types/open-now-filter.types";

type Props = {
  chips: readonly OpenNowFilterChip[];
  activeFilter: OpenNowFeedFilter;
  onFilterChange: (filter: OpenNowFeedFilter) => void;
  className?: string;
};

export function OpenNowFilterChips({
  chips,
  activeFilter,
  onFilterChange,
  className,
}: Props) {
  if (chips.length <= 1) return null;

  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto pb-1",
        "snap-x snap-mandatory scroll-smooth [scrollbar-width:thin]",
        className,
      )}
      role="group"
      aria-label={OPEN_NOW_PAGE.filterAria}
    >
      {chips.map(({ filter, label, emoji }) => {
        const active = isSameOpenNowFilter(activeFilter, filter);
        return (
          <button
            key={openNowFilterKey(filter)}
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
