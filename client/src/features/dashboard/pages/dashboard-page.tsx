"use client";

import dynamic from "next/dynamic";
import { useState, useCallback, useEffect } from "react";
import { NavSidebar, BottomNav, AppSearchTopbar } from "@/features/app-shell";
import { WelcomeTourLauncher } from "@/features/tour-guide";
import { SpacesGrid, StartSpaceModalProvider } from "@/features/spaces";
import { DashboardOpenNowSection } from "@/features/open-to-connect";
import { HeroSection } from "../components/hero-section";
import { DashboardBrowseTopicsSection } from "../components/dashboard-browse-topics-section";
import { useMatchPrepPromptStatus, useMatchPrepCurrent } from "@/features/profile-setup/api";
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

  const { data: matchPrepCurrent, isLoading: matchPrepCurrentLoading } = useMatchPrepCurrent({
    enabled: true,
  });
  const savedMatchIntent = matchPrepCurrent?.matchIntent ?? "quick";

  const [prepOpen, setPrepOpen] = useState(false);
  const [matchPrepMode, setMatchPrepMode] = useState<"match_flow" | "edit">("match_flow");
  const [pendingMatchIntent, setPendingMatchIntent] = useState<"quick" | "activity">("quick");
  const [searchingIntent, setSearchingIntent] = useState<"quick" | "activity" | null>(null);
  const [switchingToIntent, setSwitchingToIntent] = useState<"quick" | "activity" | null>(null);

  const openMatchPrep = useCallback((mode: "match_flow" | "edit", intent: "quick" | "activity" = "quick") => {
    setPendingMatchIntent(intent);
    setMatchPrepMode(mode);
    setPrepOpen(true);
  }, []);

  const beginSearch = useCallback(
    (intent: "quick" | "activity") => {
      setSearchingIntent(intent);
      handleFindMatch();
    },
    [handleFindMatch],
  );

  useEffect(() => {
    if (status === "idle" || status === "error" || status === "matched") {
      setSearchingIntent(null);
    }
  }, [status]);

  useEffect(() => {
    if (status === "searching" && searchingIntent === null && !matchPrepCurrentLoading) {
      setSearchingIntent(savedMatchIntent);
    }
  }, [status, searchingIntent, savedMatchIntent, matchPrepCurrentLoading]);

  const startMatchFlow = useCallback(
    async (intent: "quick" | "activity") => {
      if (status === "searching" || status === "proposed") {
        setSwitchingToIntent(intent);
        try {
          await handleCancel();
          openMatchPrep("match_flow", intent);
        } finally {
          setSwitchingToIntent(null);
        }
        return;
      }

      const needsPrep =
        matchPrepCurrentLoading ||
        openPrepOnFindMatchClick ||
        savedMatchIntent !== intent;

      if (needsPrep) {
        openMatchPrep("match_flow", intent);
        return;
      }

      beginSearch(intent);
    },
    [
      status,
      handleCancel,
      openPrepOnFindMatchClick,
      savedMatchIntent,
      matchPrepCurrentLoading,
      openMatchPrep,
      beginSearch,
    ],
  );

  return (
    <StartSpaceModalProvider>
      <MatchPrepDialog
        open={prepOpen}
        onOpenChange={setPrepOpen}
        onStartSearch={() => beginSearch(pendingMatchIntent)}
        clientSessionId={clientSessionId}
        mode={matchPrepMode}
        initialMatchIntent={pendingMatchIntent}
      />
      <WelcomeTourLauncher blocked={prepOpen} />
      <div className="flex h-screen overflow-hidden bg-background">
        <NavSidebar activePath="/home" />

        <main className="app-scrollbar flex min-w-0 flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
          <AppSearchTopbar />

          <div className="flex w-full flex-col gap-5 px-4 py-5 lg:px-5 lg:py-5">
            <HeroSection
              appState={status}
              searchingIntent={searchingIntent}
              switchingToIntent={switchingToIntent}
              onRequestMatch={() => void startMatchFlow("quick")}
              onRequestActivityMatch={() => void startMatchFlow("activity")}
              onCancel={handleCancel}
              onChangePreferences={() => openMatchPrep("edit")}
              error={error}
            />
            <SpacesGrid />
            <DashboardOpenNowSection />
            <DashboardBrowseTopicsSection />
          </div>
        </main>

        <RightPanel />
        <BottomNav activePath="/home" />
      </div>
    </StartSpaceModalProvider>
  );
}
