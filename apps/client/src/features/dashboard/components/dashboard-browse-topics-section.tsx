"use client";

import { useRouter } from "next/navigation";

import { SectionHeader } from "@/components/section-header";
import { ExploreBrowseNichesSection } from "@/features/explore/components/explore-browse-niches-section";
import { ExploreNicheRoomsModal } from "@/features/explore/components/explore-niche-rooms-modal";
import { useExploreBrowseNiches } from "@/features/explore/hooks/use-explore-browse-niches";
import { useExploreNicheRoomsModal } from "@/features/explore/hooks/use-explore-niche-rooms-modal";
import { DASHBOARD_SECTIONS } from "@/lib/copy/user-messages";

export function DashboardBrowseTopicsSection() {
  const router = useRouter();
  const { niches, isLoading, isError, refetch } = useExploreBrowseNiches();
  const nicheModal = useExploreNicheRoomsModal();

  if (!isLoading && !isError && niches.length === 0) {
    return null;
  }

  return (
    <>
      <section>
        <SectionHeader
          className="mb-2.5"
          title={DASHBOARD_SECTIONS.browseTopics.title}
          actionLabel={DASHBOARD_SECTIONS.browseTopics.viewAll}
          onAction={() => router.push("/explore")}
        />

        <ExploreBrowseNichesSection
          niches={niches}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          onSelectNiche={nicheModal.openForNiche}
          hideHeader
          maxItems={6}
        />
      </section>

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
    </>
  );
}
