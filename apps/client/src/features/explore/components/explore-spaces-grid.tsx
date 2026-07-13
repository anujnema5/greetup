"use client";

import { HorizontalCardCarousel } from "@/components/horizontal-card-carousel";
import { useListActiveSpaces } from "@/features/spaces/api/spaces.queries";
import {
  HomeSpaceCard,
  HomeSpaceCardSkeleton,
} from "@/features/spaces/components/home-space-card";
import { useActiveSpaceCardActions } from "@/features/spaces/hooks/use-active-space-card-actions";
import { useSpaceListBadges } from "@/features/spaces/hooks/use-space-list-badges";
import type { ActiveSpaceItem } from "@/features/spaces/types/spaces-api.types";
import { SPACE_PREVIEW_DESKTOP_GRID_CLASS } from "@/features/spaces/lib/space-preview-grid-classes";

type Props = {
  spaces: readonly ActiveSpaceItem[];
  isLoading: boolean;
  skeletonCount?: number;
  ariaLabel?: string;
};

export function ExploreSpacesGrid({
  spaces,
  isLoading,
  skeletonCount = 4,
  ariaLabel = "Active spaces",
}: Props) {
  const cardHandlers = useActiveSpaceCardActions();
  const { data } = useListActiveSpaces();
  const { badgeForSpace } = useSpaceListBadges(
    data?.friendInvited ?? [],
    data?.joined ?? [],
  );

  if (isLoading) {
    return (
      <HorizontalCardCarousel
        itemCount={skeletonCount}
        gridBreakpoint="md"
        desktopClassName={SPACE_PREVIEW_DESKTOP_GRID_CLASS}
        mobileSlideClassName="w-[min(88%,300px)] shrink-0 snap-start"
        ariaLabel={ariaLabel}
      >
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <HomeSpaceCardSkeleton key={index} />
        ))}
      </HorizontalCardCarousel>
    );
  }

  return (
    <HorizontalCardCarousel
      itemCount={spaces.length}
      gridBreakpoint="md"
      desktopClassName={SPACE_PREVIEW_DESKTOP_GRID_CLASS}
      mobileSlideClassName="w-[min(88%,300px)] shrink-0 snap-start"
      ariaLabel={ariaLabel}
    >
      {spaces.map((space) => (
        <HomeSpaceCard
          key={space.id}
          space={space}
          badge={badgeForSpace(space)}
          {...cardHandlers}
        />
      ))}
    </HorizontalCardCarousel>
  );
}
