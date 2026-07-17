"use client";

import { useMemo } from "react";

import { useBrowseNiches } from "../api/browse-niches.queries";
import { filterBrowseNiches } from "../lib/browse-niche-display";

type UseExploreBrowseNichesOptions = {
  enabled?: boolean;
};

/** Niche tiles for “Browse by niche” (live + scheduled counts per category). */
export function useExploreBrowseNiches(options?: UseExploreBrowseNichesOptions) {
  const { data, isLoading, isError, refetch, isFetching } = useBrowseNiches({
    enabled: options?.enabled ?? true,
  });

  const niches = useMemo(() => filterBrowseNiches(data?.niches ?? []), [data?.niches]);

  return {
    niches,
    isLoading: isLoading && !data,
    isError,
    isFetching,
    refetch,
  };
}
