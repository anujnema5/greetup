"use client";

import { useMemo } from "react";

import { useBrowseNiches } from "../api/browse-niches.queries";
import { filterBrowseNiches } from "../lib/browse-niche-display";

/** Niche tiles for “Browse by niche” (live + scheduled counts per category). */
export function useExploreBrowseNiches() {
  const { data, isLoading, isError, refetch, isFetching } = useBrowseNiches();

  const niches = useMemo(() => filterBrowseNiches(data?.niches ?? []), [data?.niches]);

  return {
    niches,
    isLoading: isLoading && !data,
    isError,
    isFetching,
    refetch,
  };
}
