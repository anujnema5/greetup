"use client";

import { useListActiveCircles } from "@/features/circles/api/circles.queries";
import {
  HomeCircleCard,
  HomeCircleCardSkeletonGrid,
} from "@/features/circles/components/home-circle-card";
import { useActiveCircleCardActions } from "@/features/circles/hooks/use-active-circle-card-actions";
import { useCircleListBadges } from "@/features/circles/hooks/use-circle-list-badges";
import type { ActiveCircleItem } from "@/features/circles/types/circles-api.types";

type Props = {
  circles: readonly ActiveCircleItem[];
  isLoading: boolean;
  skeletonCount?: number;
};

export function ExploreCirclesGrid({ circles, isLoading, skeletonCount = 4 }: Props) {
  const cardHandlers = useActiveCircleCardActions();
  const { data } = useListActiveCircles();
  const { badgeForCircle } = useCircleListBadges(
    data?.friendInvited ?? [],
    data?.joined ?? [],
  );

  if (isLoading) {
    return <HomeCircleCardSkeletonGrid count={skeletonCount} />;
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,280px))] gap-3">
      {circles.map((circle) => (
        <HomeCircleCard
          key={circle.id}
          circle={circle}
          badge={badgeForCircle(circle)}
          {...cardHandlers}
        />
      ))}
    </div>
  );
}
