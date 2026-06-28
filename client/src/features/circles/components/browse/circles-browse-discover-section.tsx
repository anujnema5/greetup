"use client";

import { Compass, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  ActiveCircleCardGrid,
  type ActiveCircleCardGridHandlers,
} from "../active-circle-card";
import { CIRCLES_BROWSE_SECTIONS } from "../../constants/circles-browse-copy";
import type { ActiveCircleItem } from "../../types/circles-api.types";
import { CirclesBrowseSectionEmpty } from "./circles-browse-section-empty";
import { CirclesBrowseSectionHeader } from "./circles-browse-section";

type CirclesBrowseDiscoverSectionProps = {
  items: ActiveCircleItem[];
  cardHandlers: ActiveCircleCardGridHandlers;
  renderBadge?: (item: ActiveCircleItem) => React.ReactNode;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  showEmptyState?: boolean;
};

export function CirclesBrowseDiscoverSection({
  items,
  cardHandlers,
  renderBadge,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  showEmptyState = false,
}: CirclesBrowseDiscoverSectionProps) {
  const copy = CIRCLES_BROWSE_SECTIONS.discover;

  if (items.length === 0) {
    return showEmptyState ? <CirclesBrowseSectionEmpty message={copy.empty} /> : null;
  }

  return (
    <section className="rounded-2xl border border-border bg-card/40 p-4 md:p-5">
      <CirclesBrowseSectionHeader
        title={copy.title}
        description={copy.description}
        icon={Compass}
      />
      <ActiveCircleCardGrid
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
