"use client";

import { useState } from "react";

import { Tabs } from "@/components/ui/tabs";
import { ActiveCircleCardSkeletonGrid } from "../active-circle-card";
import { useActiveCircleCardActions } from "../../hooks/use-active-circle-card-actions";
import { useCircleListBadges } from "../../hooks/use-circle-list-badges";
import { useCirclesBrowseData } from "../../hooks/use-circles-browse-data";
import { useStartCircleModal } from "../start-circle-modal-provider";
import type { CirclesBrowseTab } from "../../types/circles-browse.types";
import { CirclesBrowseEmptyState } from "./circles-browse-empty-state";
import { CirclesBrowseFooter } from "./circles-browse-footer";
import { CirclesBrowseHeader } from "./circles-browse-header";
import { CirclesBrowseShell } from "./circles-browse-shell";
import { CirclesBrowseStats } from "./circles-browse-stats";
import { CirclesBrowseTabPanels } from "./circles-browse-tab-panel";
import { CirclesBrowseTabsList } from "./circles-browse-tabs";

/**
 * Main `/circles` content: tabs, sections, pagination, and refresh.
 * Layout shell lives in {@link CirclesPage}.
 */
export function CirclesBrowseView() {
  const [tab, setTab] = useState<CirclesBrowseTab>("all");
  const { openModal } = useStartCircleModal();
  const cardHandlers = useActiveCircleCardActions();
  const browse = useCirclesBrowseData();
  const { badgeForCircle, invitedBadge, joinedBadge } = useCircleListBadges(
    browse.friendInvited,
    browse.joined,
  );

  const showStats = browse.hasLoadedOnce && !browse.isEmpty;

  return (
    <>
      <CirclesBrowseHeader onStartCircle={openModal} />

      <CirclesBrowseShell>
        {showStats ? (
          <CirclesBrowseStats
            invitedCount={browse.friendInvited.length}
            joinedCount={browse.joined.length}
            discoverCount={browse.discoverItems.length}
          />
        ) : null}

        <Tabs value={tab} onValueChange={(v) => setTab(v as CirclesBrowseTab)} className="w-full gap-4">
          <CirclesBrowseTabsList />

          {browse.isLoading && !browse.hasLoadedOnce ? (
            <div className="rounded-2xl border border-border/50 bg-card/20 p-4 md:p-5">
              <ActiveCircleCardSkeletonGrid count={6} />
            </div>
          ) : browse.isEmpty ? (
            <CirclesBrowseEmptyState onStartCircle={openModal} />
          ) : (
            <CirclesBrowseTabPanels
              friendInvited={browse.friendInvited}
              joined={browse.joined}
              discoverItems={browse.discoverItems}
              cardHandlers={cardHandlers}
              invitedBadge={invitedBadge}
              joinedBadge={joinedBadge}
              badgeForCircle={badgeForCircle}
              hasNextPage={browse.hasNextPage}
              isFetchingNextPage={browse.isFetchingNextPage}
              onLoadMore={() => void browse.fetchNextPage()}
            />
          )}
        </Tabs>

        {browse.hasLoadedOnce ? (
          <CirclesBrowseFooter
            isRefreshing={browse.isRefreshing}
            onRefresh={() => void browse.refetch()}
          />
        ) : null}
      </CirclesBrowseShell>
    </>
  );
}
