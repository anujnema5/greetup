"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavSidebar, BottomNav } from "@/features/app-shell";
import { WelcomeTourLauncher } from "@/features/tour-guide";
import { DASHBOARD_SECTIONS } from "@/lib/copy/user-messages";
import { CirclesGrid, StartCircleModalProvider } from "@/features/circles";
import { TOUR_TARGETS } from "@/features/tour-guide";
import { DashboardHeader } from "../components/dashboard-header";
import { HeroSection } from "../components/hero-section";
// import { DashboardMatchQualityCard } from "../components/dashboard-match-quality-card";
import { useGetMatchPrepPromptStatusQuery } from "@/features/profile-setup/components/profile-setup-api";
import { MatchPrepDialog, useMatchmaking } from "@/features/matching";
import { useMatchPrepClientSessionId } from "@/features/matching/hooks/use-match-prep-client-session-id";
import { APP_ROUTES } from "@/lib/routing/app-routes";

/** Side panel is desktop-only; load it in a separate chunk to keep the main dashboard bundle smaller. */
const RightPanel = dynamic(
  () => import("../components/right-panel").then((m) => m.RightPanel),
  { ssr: true }
);

export function DashboardPage() {
  const { status, error, handleFindMatch, handleCancel } = useMatchmaking();
  const clientSessionId = useMatchPrepClientSessionId();
  const {
    data: promptStatus,
    isLoading: promptLoading,
    isFetching: promptFetching,
  } = useGetMatchPrepPromptStatusQuery(clientSessionId ?? "", {
    skip: !clientSessionId,
  });

  const shouldShowPrepFromServer = promptStatus?.shouldShow === true;
  const promptStatusPending = Boolean(
    clientSessionId && (promptLoading || promptFetching),
  );
  const openPrepOnFindMatchClick = promptStatusPending || shouldShowPrepFromServer;

  const [prepOpen, setPrepOpen] = useState(false);
  const [matchPrepMode, setMatchPrepMode] = useState<"match_flow" | "edit">("match_flow");

  return (
    <StartCircleModalProvider>
      <MatchPrepDialog
        open={prepOpen}
        onOpenChange={setPrepOpen}
        onStartSearch={handleFindMatch}
        clientSessionId={clientSessionId}
        mode={matchPrepMode}
      />
      <WelcomeTourLauncher blocked={prepOpen} />
      <div className="flex h-screen overflow-hidden bg-background">
        <NavSidebar activePath={APP_ROUTES.home} />

        <main className="flex flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
          <DashboardHeader />

          <div className="flex flex-col gap-4 px-4 md:px-8 py-5">
            <HeroSection
              appState={status}
              onRequestMatch={() => {
                if (openPrepOnFindMatchClick) {
                  setMatchPrepMode("match_flow");
                  setPrepOpen(true);
                } else handleFindMatch();
              }}
              onCancel={handleCancel}
              error={error}
            />
            <div className="flex justify-end px-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 rounded-full border-border text-xs"
                data-tour-id={TOUR_TARGETS.changePreferences}
                onClick={() => {
                  setMatchPrepMode("edit");
                  setPrepOpen(true);
                }}
              >
                <SlidersHorizontal className="size-3.5 opacity-80" aria-hidden />
                {DASHBOARD_SECTIONS.changePreferences}
              </Button>
            </div>
            <CirclesGrid />

            {/* MVP: match quality card hidden on mobile too
            <div className="lg:hidden">
              <DashboardMatchQualityCard />
            </div>
            */}
          </div>
        </main>

        <RightPanel />
        <BottomNav activePath={APP_ROUTES.home} />
      </div>
    </StartCircleModalProvider>
  );
}
