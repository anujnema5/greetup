"use client";

import { useState, useMemo } from "react";

/**
 * Local search over a static people list (list size is small; no debounce).
 */
export function useExploreSearch<T extends { name: string; tagline: string }>(people: readonly T[]) {
  const [query, setQuery] = useState("");

  const normalized = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (normalized === "") return people as T[];
    return people.filter(
      (p) =>
        p.name.toLowerCase().includes(normalized) ||
        p.tagline.toLowerCase().includes(normalized)
    );
  }, [people, normalized]);

  return { query, setQuery, filtered };
}
