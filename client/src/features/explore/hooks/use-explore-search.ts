"use client";

import { useMemo, useState } from "react";

import { suggestedPersonSearchHaystack } from "../lib/explore-person-display";
import type { SuggestedPersonItem } from "../types/suggested-people.types";

/**
 * Local search over a static people list (list size is small; no debounce).
 */
export function useExploreSearch(people: readonly SuggestedPersonItem[]) {
  const [query, setQuery] = useState("");

  const normalized = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (normalized === "") return people;
    return people.filter((p) => suggestedPersonSearchHaystack(p).includes(normalized));
  }, [people, normalized]);

  return { query, setQuery, filtered };
}
