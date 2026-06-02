"use client";

import { PageHeader } from "@/features/app-shell";
import { StartCircleModalProvider } from "@/features/circles";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { EXPLORE } from "@/lib/copy/user-messages";

import { useSearchUsersQuery } from "../api/user-search-api";
import "../api/suggested-people-api";
import { ExploreSearchField } from "../components/explore-search-field";
import { ExplorePeopleLikeYouSection } from "../components/explore-people-like-you-section";
import { ExploreUserSearchResults } from "../components/explore-user-search-results";
import { ExploreBrowseNichesSection } from "../components/explore-browse-niches-section";
import { ExploreNicheRoomsModal } from "../components/explore-niche-rooms-modal";
import "../api/browse-niches-api";
import { useExploreBrowseNiches } from "../hooks/use-explore-browse-niches";
import { useExploreSearch } from "../hooks/use-explore-search";
import { useExploreNicheRoomsModal } from "../hooks/use-explore-niche-rooms-modal";
import { useExploreSuggestedPeople } from "../hooks/use-explore-suggested-people";

const SEARCH_MIN_LENGTH = 2;
const SEARCH_LIMIT = 15;

export function ExplorePage() {
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
  const { data: searchData, isFetching: isSearchLoading } = useSearchUsersQuery(
    { q: debouncedQuery, limit: SEARCH_LIMIT },
    { skip: !canSearch },
  );

  const liveResults = searchData?.items ?? [];

  const trimmed = query.trim();
  const showTopicsAndSuggested = trimmed === "";
  const showShortHint = trimmed.length === 1;
  const sectionTitle = canSearch
    ? `Results for "${debouncedQuery}"`
    : showTopicsAndSuggested
      ? EXPLORE.peopleLikeYou.title
      : showShortHint
        ? "One more character…"
        : "Keep typing…";

  return (
    <StartCircleModalProvider>
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
        <PageHeader title="Explore" subtitle="Search people by username or name" />

        <div className="flex flex-col gap-6 px-4 md:px-8 py-5">
          <ExploreSearchField value={query} onChange={setQuery} />

          {showTopicsAndSuggested && (
            <ExploreBrowseNichesSection
              niches={browseNiches}
              isLoading={nichesLoading}
              isError={nichesError}
              onRetry={() => void refetchNiches()}
              onSelectNiche={nicheModal.openForNiche}
            />
          )}

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

          <section>
            {canSearch ? (
              <>
                <h2 className="text-sm font-semibold text-foreground">{sectionTitle}</h2>
                <div className="mb-3" />
                <ExploreUserSearchResults
                  results={liveResults}
                  isLoading={isSearchLoading}
                  queryLabel={debouncedQuery}
                />
              </>
            ) : (
              (showTopicsAndSuggested || showShortHint) && (
                <>
                  {showShortHint && (
                    <p className="text-xs text-muted-foreground mb-3">
                      Enter at least {SEARCH_MIN_LENGTH} characters to search the directory.
                    </p>
                  )}

                  <ExplorePeopleLikeYouSection
                    title={sectionTitle}
                    subtitle={showTopicsAndSuggested ? sectionSubtitle : undefined}
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
              )
            )}
          </section>
        </div>
      </main>
    </StartCircleModalProvider>
  );
}
