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

export function ExploreTrendingSection({ circles, isLoading }: Props) {
  const router = useRouter();

  return (
    <section>
      <SectionHeader
        title={EXPLORE.trending.title}
        actionLabel={EXPLORE.trending.viewAll}
        onAction={() => router.push(CIRCLES_BROWSE_PATH)}
      />

      {isLoading ? (
        <ExploreCirclesGrid circles={[]} isLoading skeletonCount={2} />
      ) : circles.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
          {EXPLORE.trending.empty}
        </p>
      ) : (
        <ExploreCirclesGrid circles={circles} isLoading={false} skeletonCount={2} />
      )}
    </section>
  );
}
