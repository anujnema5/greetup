"use client";

import { useMemo } from "react";

import { NavSidebar, BottomNav } from "@/features/app-shell";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

import { useSearchUsersQuery } from "../api/user-search-api";
import { ExploreDemoPeopleList } from "../components/explore-demo-people-list";
import { ExploreSearchField } from "../components/explore-search-field";
import { ExploreUserSearchResults } from "../components/explore-user-search-results";
import { ExploreVibesSection } from "../components/explore-vibes-section";
import { VIBES, PEOPLE } from "../constants/mock-data";
import { useExploreSearch } from "../hooks/use-explore-search";

const SEARCH_MIN_LENGTH = 2;
const SEARCH_LIMIT = 15;

export function ExplorePage() {
  const { query, setQuery, filtered } = useExploreSearch(PEOPLE);
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  const canSearch = debouncedQuery.length >= SEARCH_MIN_LENGTH;
  const { data: searchData, isFetching: isSearchLoading } = useSearchUsersQuery(
    { q: debouncedQuery, limit: SEARCH_LIMIT },
    { skip: !canSearch },
  );

  const liveResults = useMemo(() => searchData?.items ?? [], [searchData?.items]);

  const trimmed = query.trim();
  const showVibesAndDemo = trimmed === "";
  const showShortHint = trimmed.length === 1;
  const sectionTitle = canSearch
    ? `Results for "${debouncedQuery}"`
    : showVibesAndDemo
      ? "Suggested (demo)"
      : showShortHint
        ? "One more character…"
        : "Keep typing…";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <NavSidebar activePath="/explore" />

      <main className="flex flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
        <header className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-8 py-4 border-b border-border bg-background shadow-sm">
          <div>
            <h1 className="text-[15px] font-semibold text-foreground leading-none">Explore</h1>
            <p className="text-[11px] text-muted-foreground mt-1">
              Search people by username or name
            </p>
          </div>
        </header>

        <div className="flex flex-col gap-6 px-4 md:px-8 py-5">
          <ExploreSearchField value={query} onChange={setQuery} />

          {showVibesAndDemo && <ExploreVibesSection vibes={VIBES} />}

          <section>
            <h2 className="text-sm font-semibold text-foreground mb-3">{sectionTitle}</h2>

            {showShortHint && !canSearch && (
              <p className="text-xs text-muted-foreground mb-3">
                Enter at least {SEARCH_MIN_LENGTH} characters to search the directory.
              </p>
            )}

            {canSearch ? (
              <ExploreUserSearchResults
                results={liveResults}
                isLoading={isSearchLoading}
                queryLabel={debouncedQuery}
              />
            ) : (
              (showVibesAndDemo || showShortHint) && (
                <ExploreDemoPeopleList people={filtered} />
              )
            )}
          </section>
        </div>
      </main>

      <BottomNav activePath="/explore" />
    </div>
  );
}
