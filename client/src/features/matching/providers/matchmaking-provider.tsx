"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useAppMatchFlow } from "../hooks/use-app-match-flow";
import { MatchFoundDialog } from "../components/match-found-dialog";

type AppMatchFlow = ReturnType<typeof useAppMatchFlow>;

export type MatchmakingContextValue = Pick<
  AppMatchFlow,
  | "status"
  | "result"
  | "error"
  | "handleFindMatch"
  | "handleCancel"
  | "restartSearch"
  | "respondToProposal"
  | "respondBusy"
  | "waitingForPeerConnect"
>;

const MatchmakingContext = createContext<MatchmakingContextValue | null>(null);

export function useMatchmaking(): MatchmakingContextValue {
  const value = useContext(MatchmakingContext);
  if (!value) {
    throw new Error("useMatchmaking must be used within MatchmakingProvider");
  }
  return value;
}

/**
 * One shared matchmaking session for the whole app: socket-driven state, the “match found” dialog,
 * and navigation into `/circle/[roomId]`. Render inside {@link SocketProvider}.
 */
export function MatchmakingProvider({ children }: { children: ReactNode }) {
  const matchFlow = useAppMatchFlow();

  const contextValue = useMemo<MatchmakingContextValue>(
    () => ({
      status: matchFlow.status,
      result: matchFlow.result,
      error: matchFlow.error,
      handleFindMatch: matchFlow.handleFindMatch,
      handleCancel: matchFlow.handleCancel,
      restartSearch: matchFlow.restartSearch,
      respondToProposal: matchFlow.respondToProposal,
      respondBusy: matchFlow.respondBusy,
      waitingForPeerConnect: matchFlow.waitingForPeerConnect,
    }),
    [
      matchFlow.status,
      matchFlow.result,
      matchFlow.error,
      matchFlow.handleFindMatch,
      matchFlow.handleCancel,
      matchFlow.restartSearch,
      matchFlow.respondToProposal,
      matchFlow.respondBusy,
      matchFlow.waitingForPeerConnect,
    ],
  );

  const isProposalDialogOpen = matchFlow.status === "proposed";

  return (
    <MatchmakingContext.Provider value={contextValue}>
      <MatchFoundDialog
        open={isProposalDialogOpen}
        peerUserId={matchFlow.result?.peerId}
        matchScore={matchFlow.result?.matchScore}
        isFallbackMatch={matchFlow.result?.isFallbackMatch}
        busy={matchFlow.respondBusy}
        waitingForPeerConnect={matchFlow.waitingForPeerConnect}
        onSkip={() => void matchFlow.respondToProposal("skip")}
        onConnect={() => void matchFlow.respondToProposal("connect")}
        onCancelSearch={matchFlow.handleCancel}
      />
      {children}
    </MatchmakingContext.Provider>
  );
}
