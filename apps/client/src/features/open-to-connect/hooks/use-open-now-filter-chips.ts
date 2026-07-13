"use client";

import { useMemo } from "react";

import { useMatchPrepCurrent, useMatchPrepOptions } from "@/features/profile-setup/api";
import { OPEN_NOW_PAGE } from "@/lib/copy/user-messages";

import type { OpenNowFeedFilter } from "../types/open-now-filter.types";

export type OpenNowFilterChip = {
  filter: OpenNowFeedFilter;
  label: string;
  emoji?: string | null;
};

export function useOpenNowFilterChips(): {
  chips: OpenNowFilterChip[];
  isLoading: boolean;
} {
  const { data: options, isLoading: optionsLoading } = useMatchPrepOptions();
  const { data: current, isLoading: currentLoading } = useMatchPrepCurrent();

  const chips = useMemo(() => {
    const rows: OpenNowFilterChip[] = [{ filter: { kind: "all" }, label: OPEN_NOW_PAGE.filterAll }];
    if (!options) return rows;

    const interestIds = current?.interestIds ?? [];
    const activityIds = new Set((current?.activitySelections ?? []).map((row) => row.activityId));

    const interestRows =
      interestIds.length > 0
        ? options.interests.filter((row) => interestIds.includes(row.id))
        : options.interests.slice(0, 6);

    for (const row of interestRows) {
      rows.push({
        filter: { kind: "interest", id: row.id },
        label: row.displayName,
      });
    }

    const activityRows =
      activityIds.size > 0
        ? options.activities.filter((row) => activityIds.has(row.id))
        : options.activities.slice(0, 4);

    for (const row of activityRows) {
      rows.push({
        filter: { kind: "activity", id: row.id },
        label: row.displayName,
        emoji: row.emoji,
      });
    }

    return rows;
  }, [current?.activitySelections, current?.interestIds, options]);

  return {
    chips,
    isLoading: optionsLoading || currentLoading,
  };
}
