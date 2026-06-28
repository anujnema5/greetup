"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { NavSidebar, BottomNav, AppSearchTopbar } from "@/features/app-shell";
import { WelcomeTourLauncher } from "@/features/tour-guide";
import { SpacesGrid, StartSpaceModalProvider } from "@/features/spaces";
import { HeroSection } from "../components/hero-section";
import { DashboardBrowseTopicsSection } from "../components/dashboard-browse-topics-section";
import { useMatchPrepPromptStatus } from "@/features/profile-setup/api";
import { MatchPrepDialog, useMatchmaking } from "@/features/matching";
import { useMatchPrepClientSessionId } from "@/features/matching/hooks/use-match-prep-client-session-id";

const RightPanel = dynamic(
  () => import("../components/right-panel").then((m) => m.RightPanel),
  { ssr: true },
);

export function DashboardPage() {
  const { status, error, handleFindMatch, handleCancel } = useMatchmaking();
  const clientSessionId = useMatchPrepClientSessionId();
  const {
    data: promptStatus,
    isLoading: promptLoading,
    isFetching: promptFetching,
  } = useMatchPrepPromptStatus(clientSessionId ?? "", {
    enabled: Boolean(clientSessionId),
  });

  const shouldShowPrepFromServer = promptStatus?.shouldShow === true;
  const promptStatusPending = Boolean(
    clientSessionId && (promptLoading || promptFetching),
  );
  const openPrepOnFindMatchClick = promptStatusPending || shouldShowPrepFromServer;

  const [prepOpen, setPrepOpen] = useState(false);
  const [matchPrepMode, setMatchPrepMode] = useState<"match_flow" | "edit">("match_flow");

  const openMatchPrep = (mode: "match_flow" | "edit") => {
    setMatchPrepMode(mode);
    setPrepOpen(true);
  };

  return (
    <StartSpaceModalProvider>
      <MatchPrepDialog
        open={prepOpen}
        onOpenChange={setPrepOpen}
        onStartSearch={handleFindMatch}
        clientSessionId={clientSessionId}
        mode={matchPrepMode}
      />
      <WelcomeTourLauncher blocked={prepOpen} />
      <div className="flex h-screen overflow-hidden bg-background">
        <NavSidebar activePath="/home" />

        <main className="app-scrollbar flex min-w-0 flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
          <AppSearchTopbar />

          <div className="flex w-full flex-col gap-5 px-4 py-5 lg:px-5 lg:py-5">
            <HeroSection
              appState={status}
              onRequestMatch={() => {
                if (openPrepOnFindMatchClick) openMatchPrep("match_flow");
                else handleFindMatch();
              }}
              onCancel={handleCancel}
              onChangePreferences={() => openMatchPrep("edit")}
              error={error}
            />
            <SpacesGrid />
            <DashboardBrowseTopicsSection />
          </div>
        </main>

        <RightPanel />
        <BottomNav activePath="/home" />
      </div>
    </StartSpaceModalProvider>
  );
}
