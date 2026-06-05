"use client";

import { UserRound, UsersRound } from "lucide-react";

import { TabsContent } from "@/components/ui/tabs";
import { CIRCLES_BROWSE_SECTIONS } from "../../constants/circles-browse-copy";
import type { ActiveCircleCardGridHandlers } from "../active-circle-card";
import type { ActiveCircleItem } from "../../types/circles-api.types";
import { CirclesBrowseDiscoverSection } from "./circles-browse-discover-section";
import { CirclesBrowseSection } from "./circles-browse-section";

type CirclesBrowseLists = {
  friendInvited: ActiveCircleItem[];
  joined: ActiveCircleItem[];
  discoverItems: ActiveCircleItem[];
};

type CirclesBrowseTabPanelProps = CirclesBrowseLists & {
  cardHandlers: ActiveCircleCardGridHandlers;
  invitedBadge: React.ReactNode;
  joinedBadge: React.ReactNode;
  badgeForCircle: (circle: ActiveCircleItem) => React.ReactNode;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
};

export function CirclesBrowseTabPanels({
  friendInvited,
  joined,
  discoverItems,
  cardHandlers,
  invitedBadge,
  joinedBadge,
  badgeForCircle,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: CirclesBrowseTabPanelProps) {
  return (
    <>
      <TabsContent value="all" className="mt-2 space-y-5 outline-none">
        <CirclesBrowseAllSections
          friendInvited={friendInvited}
          joined={joined}
          discoverItems={discoverItems}
          cardHandlers={cardHandlers}
          invitedBadge={invitedBadge}
          joinedBadge={joinedBadge}
          badgeForCircle={badgeForCircle}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={onLoadMore}
        />
      </TabsContent>

      <TabsContent value="invited" className="mt-2 outline-none">
        <CirclesBrowseSection
          copy={CIRCLES_BROWSE_SECTIONS.invited}
          items={friendInvited}
          cardHandlers={cardHandlers}
          renderBadge={() => invitedBadge}
          icon={UserRound}
          showEmptyState
        />
      </TabsContent>

      <TabsContent value="mine" className="mt-2 outline-none">
        <CirclesBrowseSection
          copy={CIRCLES_BROWSE_SECTIONS.mine}
          items={joined}
          cardHandlers={cardHandlers}
          renderBadge={() => joinedBadge}
          icon={UsersRound}
          showEmptyState
        />
      </TabsContent>

      <TabsContent value="discover" className="mt-2 outline-none">
        <CirclesBrowseDiscoverSection
          items={discoverItems}
          cardHandlers={cardHandlers}
          renderBadge={badgeForCircle}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={onLoadMore}
          showEmptyState
        />
      </TabsContent>
    </>
  );
}

function CirclesBrowseAllSections({
  friendInvited,
  joined,
  discoverItems,
  cardHandlers,
  invitedBadge,
  joinedBadge,
  badgeForCircle,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: CirclesBrowseLists & {
  cardHandlers: ActiveCircleCardGridHandlers;
  invitedBadge: React.ReactNode;
  joinedBadge: React.ReactNode;
  badgeForCircle: (circle: ActiveCircleItem) => React.ReactNode;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}) {
  return (
    <>
      <CirclesBrowseSection
        copy={CIRCLES_BROWSE_SECTIONS.invited}
        items={friendInvited}
        cardHandlers={cardHandlers}
        renderBadge={() => invitedBadge}
        icon={UserRound}
      />
      <CirclesBrowseSection
        copy={CIRCLES_BROWSE_SECTIONS.mine}
        items={joined}
        cardHandlers={cardHandlers}
        renderBadge={() => joinedBadge}
        icon={UsersRound}
      />
      <CirclesBrowseDiscoverSection
        items={discoverItems}
        cardHandlers={cardHandlers}
        renderBadge={badgeForCircle}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={onLoadMore}
      />
    </>
  );
}
