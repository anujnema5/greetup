"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { SlidersHorizontal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavSidebar, BottomNav } from "@/features/app-shell";
import { HeroSection } from "../components/hero-section";
import { CirclesGrid, StartCircleModalProvider } from "@/features/circles";
import { DashboardHeader } from "../components/dashboard-header";
import { useGetMatchPrepPromptStatusQuery } from "@/features/profile-setup/components/profile-setup-api";
import { MatchPrepDialog, useMatchmaking } from "@/features/matching";
import { useMatchPrepClientSessionId } from "@/features/matching/hooks/use-match-prep-client-session-id";

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
      <div className="flex h-screen overflow-hidden bg-background">
        <NavSidebar activePath="/" />

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
                onClick={() => {
                  setMatchPrepMode("edit");
                  setPrepOpen(true);
                }}
              >
                <SlidersHorizontal className="size-3.5 opacity-80" aria-hidden />
                Change match preferences
              </Button>
            </div>
            <CirclesGrid />

            <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4">
              <Sparkles size={15} className="text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Your match quality is high today</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  We found 8 people with strong alignment to your profile. Hit Find Match to connect.
                </p>
              </div>
            </div>
          </div>
        </main>

        <RightPanel />
        <BottomNav activePath="/" />
      </div>
    </StartCircleModalProvider>
  );
}
