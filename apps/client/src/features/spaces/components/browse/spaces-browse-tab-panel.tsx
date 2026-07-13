"use client";

import { UserRound, UsersRound } from "lucide-react";

import { TabsContent } from "@/components/ui/tabs";
import { SPACES_BROWSE_SECTIONS } from "../../constants/spaces-browse-copy";
import type { ActiveSpaceCardGridHandlers } from "../active-space-card";
import type { ActiveSpaceItem } from "../../types/spaces-api.types";
import { SpacesBrowseDiscoverSection } from "./spaces-browse-discover-section";
import { SpacesBrowseSection } from "./spaces-browse-section";

type SpacesBrowseLists = {
  friendInvited: ActiveSpaceItem[];
  joined: ActiveSpaceItem[];
  discoverItems: ActiveSpaceItem[];
};

type SpacesBrowseTabPanelProps = SpacesBrowseLists & {
  cardHandlers: ActiveSpaceCardGridHandlers;
  invitedBadge: React.ReactNode;
  joinedBadge: React.ReactNode;
  badgeForSpace: (space: ActiveSpaceItem) => React.ReactNode;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
};

export function SpacesBrowseTabPanels({
  friendInvited,
  joined,
  discoverItems,
  cardHandlers,
  invitedBadge,
  joinedBadge,
  badgeForSpace,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: SpacesBrowseTabPanelProps) {
  return (
    <>
      <TabsContent value="all" className="mt-2 space-y-5 outline-none">
        <SpacesBrowseAllSections
          friendInvited={friendInvited}
          joined={joined}
          discoverItems={discoverItems}
          cardHandlers={cardHandlers}
          invitedBadge={invitedBadge}
          joinedBadge={joinedBadge}
          badgeForSpace={badgeForSpace}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={onLoadMore}
        />
      </TabsContent>

      <TabsContent value="invited" className="mt-2 outline-none">
        <SpacesBrowseSection
          copy={SPACES_BROWSE_SECTIONS.invited}
          items={friendInvited}
          cardHandlers={cardHandlers}
          renderBadge={() => invitedBadge}
          icon={UserRound}
          showEmptyState
        />
      </TabsContent>

      <TabsContent value="mine" className="mt-2 outline-none">
        <SpacesBrowseSection
          copy={SPACES_BROWSE_SECTIONS.mine}
          items={joined}
          cardHandlers={cardHandlers}
          renderBadge={() => joinedBadge}
          icon={UsersRound}
          showEmptyState
        />
      </TabsContent>

      <TabsContent value="discover" className="mt-2 outline-none">
        <SpacesBrowseDiscoverSection
          items={discoverItems}
          cardHandlers={cardHandlers}
          renderBadge={badgeForSpace}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={onLoadMore}
          showEmptyState
        />
      </TabsContent>
    </>
  );
}

function SpacesBrowseAllSections({
  friendInvited,
  joined,
  discoverItems,
  cardHandlers,
  invitedBadge,
  joinedBadge,
  badgeForSpace,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: SpacesBrowseLists & {
  cardHandlers: ActiveSpaceCardGridHandlers;
  invitedBadge: React.ReactNode;
  joinedBadge: React.ReactNode;
  badgeForSpace: (space: ActiveSpaceItem) => React.ReactNode;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}) {
  return (
    <>
      <SpacesBrowseSection
        copy={SPACES_BROWSE_SECTIONS.invited}
        items={friendInvited}
        cardHandlers={cardHandlers}
        renderBadge={() => invitedBadge}
        icon={UserRound}
      />
      <SpacesBrowseSection
        copy={SPACES_BROWSE_SECTIONS.mine}
        items={joined}
        cardHandlers={cardHandlers}
        renderBadge={() => joinedBadge}
        icon={UsersRound}
      />
      <SpacesBrowseDiscoverSection
        items={discoverItems}
        cardHandlers={cardHandlers}
        renderBadge={badgeForSpace}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={onLoadMore}
      />
    </>
  );
}
