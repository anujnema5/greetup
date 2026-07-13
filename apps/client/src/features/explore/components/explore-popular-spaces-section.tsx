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

export function ExplorePopularSpacesSection({ spaces, isLoading }: Props) {
  const router = useRouter();

  if (!isLoading && spaces.length === 0) {
    return null;
  }

  return (
    <section>
      <SectionHeader
        title={EXPLORE.popularSpaces.title}
        actionLabel={EXPLORE.popularSpaces.viewAll}
        onAction={() => router.push(SPACES_BROWSE_PATH)}
      />

      <ExploreSpacesGrid spaces={spaces} isLoading={isLoading} skeletonCount={6} />
    </section>
  );
}
