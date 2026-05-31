"use client";

import { memo } from "react";
import { Plus } from "lucide-react";

import { useStartCircleModal } from "@/features/circles";

import { DASHBOARD_SECTIONS } from "@/lib/copy/user-messages";

import { DashboardActiveNowSection } from "./dashboard-active-now-section";
// import { DashboardMatchQualityCard } from "./dashboard-match-quality-card";
import { DashboardRecentConnectionsSection } from "./dashboard-recent-connections-section";
import { DashboardRecentMatchesSection } from "./dashboard-recent-matches-section";
// import { DashboardTrendingTopicsSection } from "./dashboard-trending-topics-section";

function RightPanelInner() {
  const { openModal } = useStartCircleModal();

  return (
    <aside className="hidden min-h-screen w-72 flex-col gap-5 border-l border-border bg-card px-4 py-5 lg:flex">
      <button
        type="button"
        onClick={openModal}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
      >
        <Plus size={15} />
        {DASHBOARD_SECTIONS.startCircle}
      </button>

      <DashboardActiveNowSection />

      <div className="h-px bg-border" />

      <DashboardRecentMatchesSection />

      <div className="h-px bg-border" />

      <DashboardRecentConnectionsSection />

      {/* MVP: hide trending topics until we have enough users / activity
      <div className="h-px bg-border" />

      <DashboardTrendingTopicsSection />
      */}

      {/* MVP: match quality card hidden until we have reliable alignment counts
      <DashboardMatchQualityCard className="mt-auto" />
      */}
    </aside>
  );
}

export const RightPanel = memo(RightPanelInner);
