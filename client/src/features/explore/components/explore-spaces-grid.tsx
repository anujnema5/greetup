"use client";

import { useListActiveSpaces } from "@/features/spaces/api/spaces.queries";
import {
  HomeSpaceCard,
  HomeSpaceCardSkeletonGrid,
} from "@/features/spaces/components/home-space-card";
import { useActiveSpaceCardActions } from "@/features/spaces/hooks/use-active-space-card-actions";
import { useSpaceListBadges } from "@/features/spaces/hooks/use-space-list-badges";
import type { ActiveSpaceItem } from "@/features/spaces/types/spaces-api.types";
import { SPACE_PREVIEW_GRID_CLASS } from "@/features/spaces/lib/space-preview-grid-classes";

type Props = {
  spaces: readonly ActiveSpaceItem[];
  isLoading: boolean;
  skeletonCount?: number;
};

export function ExploreSpacesGrid({ spaces, isLoading, skeletonCount = 4 }: Props) {
  const cardHandlers = useActiveSpaceCardActions();
  const { data } = useListActiveSpaces();
  const { badgeForSpace } = useSpaceListBadges(
    data?.friendInvited ?? [],
    data?.joined ?? [],
  );

  if (isLoading) {
    return <HomeSpaceCardSkeletonGrid count={skeletonCount} />;
  }

  return (
    <div className={SPACE_PREVIEW_GRID_CLASS}>
      {spaces.map((space) => (
        <HomeSpaceCard
          key={space.id}
          space={space}
          badge={badgeForSpace(space)}
          {...cardHandlers}
        />
      ))}
    </div>
  );
}
