"use client";

import { memo } from "react";
import { TOUR_TARGETS } from "@/features/tour-guide";

import { DashboardActiveNowSection } from "./dashboard-active-now-section";
import { DashboardOpenNowSidebarSection, OpenToConnectInboundSection } from "@/features/open-to-connect";
import { DashboardProfileCard } from "./dashboard-profile-card";
import { DashboardRecentMatchesSection } from "./dashboard-recent-matches-section";

function RightPanelInner() {
  return (
    <aside
      className="hidden h-screen w-72 shrink-0 flex-col border-l border-border/80 bg-background lg:flex"
      data-tour-id={TOUR_TARGETS.dashboardSidebar}
    >
      <div className="shrink-0 border-b border-border p-4">
        <DashboardProfileCard />
      </div>

      <div className="app-scrollbar flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4">
        <OpenToConnectInboundSection />
        <DashboardOpenNowSidebarSection />
        <DashboardActiveNowSection />
        <DashboardRecentMatchesSection />
      </div>
    </aside>
  );
}

export const RightPanel = memo(RightPanelInner);
