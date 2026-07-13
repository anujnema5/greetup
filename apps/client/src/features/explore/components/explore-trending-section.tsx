"use client";

import { useRouter } from "next/navigation";

import { SectionHeader } from "@/components/section-header";
import { SPACES_BROWSE_PATH } from "@/features/spaces/lib/spaces-browse-path";
import { EXPLORE } from "@/lib/copy/user-messages";
import type { ActiveSpaceItem } from "@/features/spaces/types/spaces-api.types";

import { ExploreSpacesGrid } from "./explore-spaces-grid";

type Props = {
  spaces: readonly ActiveSpaceItem[];
  isLoading: boolean;
};

export function ExploreTrendingSection({ spaces, isLoading }: Props) {
  const router = useRouter();

  return (
    <section>
      <SectionHeader
        title={EXPLORE.trending.title}
        actionLabel={EXPLORE.trending.viewAll}
        onAction={() => router.push(SPACES_BROWSE_PATH)}
      />

      {isLoading ? (
        <ExploreSpacesGrid spaces={[]} isLoading skeletonCount={2} />
      ) : spaces.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
          {EXPLORE.trending.empty}
        </p>
      ) : (
        <ExploreSpacesGrid spaces={spaces} isLoading={false} skeletonCount={2} />
      )}
    </section>
  );
}
