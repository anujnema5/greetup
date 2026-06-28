"use client";

import { Compass, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  ActiveSpaceCardGrid,
  type ActiveSpaceCardGridHandlers,
} from "../active-space-card";
import { SPACES_BROWSE_SECTIONS } from "../../constants/spaces-browse-copy";
import type { ActiveSpaceItem } from "../../types/spaces-api.types";
import { SpacesBrowseSectionEmpty } from "./spaces-browse-section-empty";
import { SpacesBrowseSectionHeader } from "./spaces-browse-section";

type SpacesBrowseDiscoverSectionProps = {
  items: ActiveSpaceItem[];
  cardHandlers: ActiveSpaceCardGridHandlers;
  renderBadge?: (item: ActiveSpaceItem) => React.ReactNode;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  showEmptyState?: boolean;
};

export function SpacesBrowseDiscoverSection({
  items,
  cardHandlers,
  renderBadge,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  showEmptyState = false,
}: SpacesBrowseDiscoverSectionProps) {
  const copy = SPACES_BROWSE_SECTIONS.discover;

  if (items.length === 0) {
    return showEmptyState ? <SpacesBrowseSectionEmpty message={copy.empty} /> : null;
  }

  return (
    <section className="rounded-2xl border border-border bg-card/40 p-4 md:p-5">
      <SpacesBrowseSectionHeader
        title={copy.title}
        description={copy.description}
        icon={Compass}
      />
      <ActiveSpaceCardGrid
        items={items}
        renderBadge={renderBadge}
        className="gap-3"
        {...cardHandlers}
      />
      {hasNextPage ? (
        <div className="flex justify-center pt-6">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full min-w-[8.5rem]"
            disabled={isFetchingNextPage}
            onClick={onLoadMore}
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Loading…
              </>
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
