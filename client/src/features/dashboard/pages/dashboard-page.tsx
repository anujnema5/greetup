"use client";

import dynamic from "next/dynamic";
import { Sparkles } from "lucide-react";
import { NavSidebar, BottomNav } from "@/features/app-shell";
import { HeroSection } from "../components/hero-section";
import { CirclesGrid, StartCircleModalProvider } from "@/features/circles";
import { DashboardHeader } from "../components/dashboard-header";
import { useDashboardMatchFlow } from "../hooks/use-dashboard-match-flow";
import { MatchFoundDialog } from "@/features/matching/components/match-found-dialog";

/** Side panel is desktop-only; load it in a separate chunk to keep the main dashboard bundle smaller. */
const RightPanel = dynamic(
  () => import("../components/right-panel").then((m) => m.RightPanel),
  { ssr: true }
);

export function DashboardPage() {
  const {
    status,
    result,
    error,
    handleFindMatch,
    handleCancel,
    respondToProposal,
    respondBusy,
  } = useDashboardMatchFlow();

  const proposedOpen = status === "proposed";

  return (
    <StartCircleModalProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <NavSidebar activePath="/" />

        <MatchFoundDialog
          open={proposedOpen}
          peerUserId={result?.peerId}
          matchScore={result?.matchScore}
          isFallbackMatch={result?.isFallbackMatch}
          busy={respondBusy}
          onSkip={() => void respondToProposal("skip")}
          onConnect={() => void respondToProposal("connect")}
          onCancelSearch={handleCancel}
        />

        <main className="flex flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
          <DashboardHeader />

          <div className="flex flex-col gap-4 px-4 md:px-8 py-5">
            <HeroSection
              appState={status}
              onToggle={handleFindMatch}
              onCancel={handleCancel}
              error={error}
            />
            <CirclesGrid />

            <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4">
              <Sparkles size={15} className="text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Your match quality is high today</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  We found 8 people with strong vibe alignment based on your profile. Hit Find Match to connect.
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
