"use client";

import { useState } from "react";

import { NavSidebar, BottomNav, AppTopbar, AppTopbarShell } from "@/features/app-shell";
import { StartCircleModalProvider } from "@/features/circles";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { EXPLORE } from "@/lib/copy/user-messages";

import { useSearchUsers } from "../api/user-search.queries";
import { ExploreFilterChips } from "../components/explore-filter-chips";
import { ExplorePeopleLikeYouSection } from "../components/explore-people-like-you-section";
import { ExploreUserSearchResults } from "../components/explore-user-search-results";
import { ExploreBrowseNichesSection } from "../components/explore-browse-niches-section";
import { ExploreNicheRoomsModal } from "../components/explore-niche-rooms-modal";
import { ExploreTrendingSection } from "../components/explore-trending-section";
import { ExplorePopularCirclesSection } from "../components/explore-popular-circles-section";
import { useExploreBrowseNiches } from "../hooks/use-explore-browse-niches";
import { useExploreCircles } from "../hooks/use-explore-circles";
import { useExploreSearch } from "../hooks/use-explore-search";
import { useExploreNicheRoomsModal } from "../hooks/use-explore-niche-rooms-modal";
import { useExploreSuggestedPeople } from "../hooks/use-explore-suggested-people";
import type { ExploreFilter } from "../types/explore-filter.types";

const SEARCH_MIN_LENGTH = 2;
const SEARCH_LIMIT = 15;

export function ExplorePage() {
  const [activeFilter, setActiveFilter] = useState<ExploreFilter>("for-you");

  const { niches: browseNiches, isLoading: nichesLoading, isError: nichesError, refetch: refetchNiches } =
    useExploreBrowseNiches();

  const nicheModal = useExploreNicheRoomsModal();

  const {
    suggestedPeople,
    sectionSubtitle,
    showEmptyNoMatches,
    hasUserInterests,
    hasLoadedData,
    serverHasMore,
    isLoading: isSuggestedLoading,
    isError: isSuggestedError,
    canLoadMore,
    loadMoreSentinelRef,
  } = useExploreSuggestedPeople();

  const { query, setQuery, filtered } = useExploreSearch(suggestedPeople);
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  const showSuggestedEndMessage =
    !isSuggestedLoading &&
    filtered.length > 0 &&
    !canLoadMore &&
    !serverHasMore &&
    !query.trim();

  const canSearch = debouncedQuery.length >= SEARCH_MIN_LENGTH;
  const { data: searchData, isFetching: isSearchLoading } = useSearchUsers(
    { q: debouncedQuery, limit: SEARCH_LIMIT },
    { enabled: canSearch },
  );

  const liveResults = searchData?.items ?? [];

  const trimmed = query.trim();
  const showDiscovery = trimmed === "";
  const showShortHint = trimmed.length === 1;
  const sectionTitle = canSearch
    ? `Results for "${debouncedQuery}"`
    : showDiscovery
      ? EXPLORE.peopleToMeet.title
      : showShortHint
        ? "One more character…"
        : "Keep typing…";

  const {
    trending,
    popular,
    isLoading: circlesLoading,
  } = useExploreCircles(activeFilter);

  return (
    <StartCircleModalProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <NavSidebar activePath="/explore" />

        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
          <AppTopbarShell>
            <AppTopbar
              searchQuery={query}
              onSearchQueryChange={setQuery}
              showStartCircle
            />
          </AppTopbarShell>

          <div className="flex w-full flex-col gap-8 px-4 py-5 lg:px-8 lg:py-6">
            <header className="space-y-1">
              <h1 className="text-[26px] font-extrabold tracking-tight text-foreground">Explore</h1>
              <p className="text-[15px] text-muted-foreground">{EXPLORE.pageSubtitle}</p>
            </header>

            {showDiscovery ? (
              <ExploreFilterChips
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                niches={browseNiches}
              />
            ) : null}

            {canSearch ? (
              <section>
                <h2 className="mb-3 text-base font-semibold tracking-tight text-foreground">
                  {sectionTitle}
                </h2>
                <ExploreUserSearchResults
                  results={liveResults}
                  isLoading={isSearchLoading}
                  queryLabel={debouncedQuery}
                />
              </section>
            ) : showDiscovery ? (
              <>
                <ExploreTrendingSection circles={trending} isLoading={circlesLoading} />

                <ExplorePopularCirclesSection circles={popular} isLoading={circlesLoading} />

                <ExploreBrowseNichesSection
                  niches={browseNiches}
                  isLoading={nichesLoading}
                  isError={nichesError}
                  onRetry={() => void refetchNiches()}
                  onSelectNiche={nicheModal.openForNiche}
                />

                <ExplorePeopleLikeYouSection
                  title={sectionTitle}
                  subtitle={sectionSubtitle}
                  hasUserInterests={hasUserInterests}
                  hasLoadedData={hasLoadedData}
                  isLoading={isSuggestedLoading}
                  isError={isSuggestedError}
                  showEmptyNoMatches={showEmptyNoMatches}
                  people={filtered}
                  canLoadMore={canLoadMore && !query.trim()}
                  loadMoreSentinelRef={loadMoreSentinelRef}
                  showEndMessage={showSuggestedEndMessage}
                />
              </>
            ) : (
              (showShortHint || trimmed.length > 0) && (
                <section>
                  {showShortHint ? (
                    <p className="mb-3 text-xs text-muted-foreground">
                      Enter at least {SEARCH_MIN_LENGTH} characters to search the directory.
                    </p>
                  ) : null}

                  <ExplorePeopleLikeYouSection
                    title={sectionTitle}
                    hasUserInterests={hasUserInterests}
                    hasLoadedData={hasLoadedData}
                    isLoading={isSuggestedLoading}
                    isError={isSuggestedError}
                    showEmptyNoMatches={showEmptyNoMatches}
                    people={filtered}
                    canLoadMore={canLoadMore && !query.trim()}
                    loadMoreSentinelRef={loadMoreSentinelRef}
                    showEndMessage={showSuggestedEndMessage}
                  />
                </section>
              )
            )}
          </div>
        </main>

        <ExploreNicheRoomsModal
          niche={nicheModal.selectedNiche}
          open={nicheModal.open}
          onOpenChange={(next) => {
            if (!next) nicheModal.close();
          }}
          rooms={nicheModal.rooms}
          isLoading={nicheModal.isLoading}
          isLoadingMore={nicheModal.isLoadingMore}
          isError={nicheModal.isError}
          hasMore={nicheModal.hasMore}
          onLoadMore={nicheModal.loadMore}
        />

        <BottomNav activePath="/explore" />
      </div>
    </StartCircleModalProvider>
  );
}
