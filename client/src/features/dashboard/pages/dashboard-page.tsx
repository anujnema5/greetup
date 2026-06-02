"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WelcomeTourLauncher } from "@/features/tour-guide";
import { DASHBOARD_SECTIONS } from "@/lib/copy/user-messages";
import { CirclesGrid } from "@/features/circles";
import { TOUR_TARGETS } from "@/features/tour-guide";
import { DashboardHeader } from "../components/dashboard-header";
import { HeroSection } from "../components/hero-section";
import { useGetMatchPrepPromptStatusQuery } from "@/features/profile-setup/components/profile-setup-api";
import { MatchPrepDialog, useMatchmaking } from "@/features/matching";
import { useMatchPrepClientSessionId } from "@/features/matching/hooks/use-match-prep-client-session-id";

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
    <>
      <MatchPrepDialog
        open={prepOpen}
        onOpenChange={setPrepOpen}
        onStartSearch={handleFindMatch}
        clientSessionId={clientSessionId}
        mode={matchPrepMode}
      />
      <WelcomeTourLauncher blocked={prepOpen} />
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
        <DashboardHeader />

        <div className="flex flex-col gap-4 px-4 py-5 md:px-8">
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
        </div>
      </main>
    </>
  );
}
