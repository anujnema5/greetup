"use client";

import { AppSearchDropdown } from "@/features/explore/components/app-search-dropdown";
import { ExploreNicheRoomsModal } from "@/features/explore/components/explore-niche-rooms-modal";
import { useAppSearch } from "@/features/explore/hooks/use-app-search";
import { useExploreNicheRoomsModal } from "@/features/explore/hooks/use-explore-niche-rooms-modal";
import { useJoinSpace } from "@/features/spaces/hooks/use-join-space";

import { AppTopbar, AppTopbarShell } from "./app-topbar";

type AppSearchTopbarProps = {
  showStartSpace?: boolean;
};

/** Home / Explore header with search dropdown, notifications, and account menu. */
export function AppSearchTopbar({ showStartSpace = false }: AppSearchTopbarProps) {
  const { query, setQuery, results } = useAppSearch();
  const topicModal = useExploreNicheRoomsModal();
  const joinSpace = useJoinSpace();

  return (
    <>
      <AppTopbarShell>
        <AppTopbar
          searchQuery={query}
          onSearchQueryChange={setQuery}
          showStartSpace={showStartSpace}
          searchPanel={
            <AppSearchDropdown
              {...results}
              onSelectSpace={joinSpace}
              onSelectTopic={topicModal.openForNiche}
            />
          }
        />
      </AppTopbarShell>

      <ExploreNicheRoomsModal
        niche={topicModal.selectedNiche}
        open={topicModal.open}
        onOpenChange={(next) => {
          if (!next) topicModal.close();
        }}
        rooms={topicModal.rooms}
        isLoading={topicModal.isLoading}
        isLoadingMore={topicModal.isLoadingMore}
        isError={topicModal.isError}
        hasMore={topicModal.hasMore}
        onLoadMore={topicModal.loadMore}
      />
    </>
  );
}
