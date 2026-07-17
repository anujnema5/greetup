"use client";

import { useMemo, useState } from "react";

import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

import { useSearchUsers } from "../api/user-search.queries";
import {
  APP_SEARCH_MIN_LENGTH,
  APP_SEARCH_RESULT_LIMIT,
  filterSpacesForSearch,
  filterTopicsForSearch,
} from "../lib/app-search-filters";
import type { AppSearchResults } from "../types/app-search.types";
import { useExploreBrowseNiches } from "./use-explore-browse-niches";
import { useExploreSpaces } from "./use-explore-spaces";

type UseAppSearchOptions = {
  /** When false, skip spaces/niches/people fetches (e.g. palette closed). */
  enabled?: boolean;
};

/** Search people (API), spaces, and topics for the app topbar dropdown. */
export function useAppSearch(options?: UseAppSearchOptions) {
  const enabled = options?.enabled ?? true;
  const [query, setQuery] = useState("");
  const trimmed = query.trim();
  const debouncedQuery = useDebouncedValue(trimmed, 300);
  const canSearch = enabled && debouncedQuery.length >= APP_SEARCH_MIN_LENGTH;

  const { data: peopleData, isFetching: isPeopleLoading } = useSearchUsers(
    { q: debouncedQuery, limit: APP_SEARCH_RESULT_LIMIT },
    { enabled: canSearch },
  );

  const { allSpaces, isLoading: isSpacesLoading } = useExploreSpaces("for-you", {
    enabled,
  });
  const { niches, isLoading: isTopicsLoading } = useExploreBrowseNiches({
    enabled,
  });

  const people = canSearch ? (peopleData?.items ?? []) : [];

  const spaces = useMemo(
    () => (canSearch ? filterSpacesForSearch(allSpaces, debouncedQuery) : []),
    [allSpaces, canSearch, debouncedQuery],
  );

  const topics = useMemo(
    () => (canSearch ? filterTopicsForSearch(niches, debouncedQuery) : []),
    [canSearch, debouncedQuery, niches],
  );

  const isLoading = canSearch && (isPeopleLoading || isSpacesLoading || isTopicsLoading);

  const results: AppSearchResults = {
    query: trimmed,
    debouncedQuery,
    canSearch,
    isLoading,
    hasResults: people.length > 0 || spaces.length > 0 || topics.length > 0,
    minLength: APP_SEARCH_MIN_LENGTH,
    people,
    spaces,
    topics,
  };

  return { query, setQuery, results };
}
