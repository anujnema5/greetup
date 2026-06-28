"use client";

import { useState } from "react";

import { Tabs } from "@/components/ui/tabs";
import { ActiveSpaceCardSkeletonGrid } from "../active-space-card";
import { useActiveSpaceCardActions } from "../../hooks/use-active-space-card-actions";
import { useSpaceListBadges } from "../../hooks/use-space-list-badges";
import { useSpacesBrowseData } from "../../hooks/use-spaces-browse-data";
import { useStartSpaceModal } from "../start-space-modal-provider";
import type { SpacesBrowseTab } from "../../types/spaces-browse.types";
import { SpacesBrowseEmptyState } from "./spaces-browse-empty-state";
import { SpacesBrowseFooter } from "./spaces-browse-footer";
import { SpacesBrowseHeader } from "./spaces-browse-header";
import { SpacesBrowseShell } from "./spaces-browse-shell";
import { SpacesBrowseStats } from "./spaces-browse-stats";
import { SpacesBrowseTabPanels } from "./spaces-browse-tab-panel";
import { SpacesBrowseTabsList } from "./spaces-browse-tabs";

/**
 * Main `/spaces` content: tabs, sections, pagination, and refresh.
 * Layout shell lives in {@link SpacesPage}.
 */
export function SpacesBrowseView() {
  const [tab, setTab] = useState<SpacesBrowseTab>("all");
  const { openModal } = useStartSpaceModal();
  const cardHandlers = useActiveSpaceCardActions();
  const browse = useSpacesBrowseData();
  const { badgeForSpace, invitedBadge, joinedBadge } = useSpaceListBadges(
    browse.friendInvited,
    browse.joined,
  );

  const showStats = browse.hasLoadedOnce && !browse.isEmpty;

  return (
    <>
      <SpacesBrowseHeader onStartSpace={openModal} />

      <SpacesBrowseShell>
        {showStats ? (
          <SpacesBrowseStats
            invitedCount={browse.friendInvited.length}
            joinedCount={browse.joined.length}
            discoverCount={browse.discoverItems.length}
          />
        ) : null}

        <Tabs value={tab} onValueChange={(v) => setTab(v as SpacesBrowseTab)} className="w-full gap-4">
          <SpacesBrowseTabsList />

          {browse.isLoading && !browse.hasLoadedOnce ? (
            <div className="rounded-2xl border border-border bg-card/40 p-4 md:p-5">
              <ActiveSpaceCardSkeletonGrid count={6} />
            </div>
          ) : browse.isEmpty ? (
            <SpacesBrowseEmptyState onStartSpace={openModal} />
          ) : (
            <SpacesBrowseTabPanels
              friendInvited={browse.friendInvited}
              joined={browse.joined}
              discoverItems={browse.discoverItems}
              cardHandlers={cardHandlers}
              invitedBadge={invitedBadge}
              joinedBadge={joinedBadge}
              badgeForSpace={badgeForSpace}
              hasNextPage={browse.hasNextPage}
              isFetchingNextPage={browse.isFetchingNextPage}
              onLoadMore={() => void browse.fetchNextPage()}
            />
          )}
        </Tabs>

        {browse.hasLoadedOnce ? (
          <SpacesBrowseFooter
            isRefreshing={browse.isRefreshing}
            onRefresh={() => void browse.refetch()}
          />
        ) : null}
      </SpacesBrowseShell>
    </>
  );
}
