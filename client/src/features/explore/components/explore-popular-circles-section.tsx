"use client";

import { useRouter } from "next/navigation";

import { SectionHeader } from "@/components/section-header";
import { CIRCLES_BROWSE_PATH } from "@/features/circles/lib/circles-browse-path";
import { EXPLORE } from "@/lib/copy/user-messages";
import type { ActiveCircleItem } from "@/features/circles/types/circles-api.types";

import { ExploreCirclesGrid } from "./explore-circles-grid";

type Props = {
  circles: readonly ActiveCircleItem[];
  isLoading: boolean;
};

export function ExplorePopularCirclesSection({ circles, isLoading }: Props) {
  const router = useRouter();

  if (!isLoading && circles.length === 0) {
    return null;
  }

  return (
    <section>
      <SectionHeader
        title={EXPLORE.popularCircles.title}
        actionLabel={EXPLORE.popularCircles.viewAll}
        onAction={() => router.push(CIRCLES_BROWSE_PATH)}
      />

      <ExploreCirclesGrid circles={circles} isLoading={isLoading} skeletonCount={6} />
    </section>
  );
}
