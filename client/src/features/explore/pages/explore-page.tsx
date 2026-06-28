"use client";

import { useState } from "react";

import { NavSidebar, BottomNav, AppSearchTopbar, PageContentHeader } from "@/features/app-shell";
import { StartSpaceModalProvider } from "@/features/spaces";
import { EXPLORE } from "@/lib/copy/user-messages";

import { ExploreFilterChips } from "../components/explore-filter-chips";
import { ExplorePeopleLikeYouSection } from "../components/explore-people-like-you-section";
import { ExploreBrowseNichesSection } from "../components/explore-browse-niches-section";
import { ExploreNicheRoomsModal } from "../components/explore-niche-rooms-modal";
import { ExploreTrendingSection } from "../components/explore-trending-section";
import { ExplorePopularSpacesSection } from "../components/explore-popular-spaces-section";
import { useExploreBrowseNiches } from "../hooks/use-explore-browse-niches";
import { useExploreSpaces } from "../hooks/use-explore-spaces";
import { useExploreNicheRoomsModal } from "../hooks/use-explore-niche-rooms-modal";
import { useExploreSuggestedPeople } from "../hooks/use-explore-suggested-people";
import type { ExploreFilter } from "../types/explore-filter.types";

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

  const showSuggestedEndMessage =
    !isSuggestedLoading &&
    suggestedPeople.length > 0 &&
    !canLoadMore &&
    !serverHasMore;

  const {
    trending,
    popular,
    isLoading: spacesLoading,
  } = useExploreSpaces(activeFilter);

  return (
    <StartSpaceModalProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <NavSidebar activePath="/explore" />

        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
          <AppSearchTopbar showStartSpace />

          <div className="flex w-full flex-col gap-8 px-4 py-5 lg:px-8 lg:py-6">
            <PageContentHeader title="Explore" subtitle={EXPLORE.pageSubtitle} />

            <ExploreFilterChips
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              niches={browseNiches}
            />

            <ExploreTrendingSection spaces={trending} isLoading={spacesLoading} />

            <ExplorePopularSpacesSection spaces={popular} isLoading={spacesLoading} />

            <ExploreBrowseNichesSection
              niches={browseNiches}
              isLoading={nichesLoading}
              isError={nichesError}
              onRetry={() => void refetchNiches()}
              onSelectNiche={nicheModal.openForNiche}
            />

            <ExplorePeopleLikeYouSection
              title={EXPLORE.peopleToMeet.title}
              subtitle={sectionSubtitle}
              hasUserInterests={hasUserInterests}
              hasLoadedData={hasLoadedData}
              isLoading={isSuggestedLoading}
              isError={isSuggestedError}
              showEmptyNoMatches={showEmptyNoMatches}
              people={suggestedPeople}
              canLoadMore={canLoadMore}
              loadMoreSentinelRef={loadMoreSentinelRef}
              showEndMessage={showSuggestedEndMessage}
            />
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
    </StartSpaceModalProvider>
  );
}
