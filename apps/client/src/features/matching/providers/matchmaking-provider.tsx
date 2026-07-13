"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useAppMatchFlow } from "../hooks/use-app-match-flow";
import { MatchFoundDialog } from "../components/match-found-dialog";
import { OpenToConnectPostNoMatchDialog } from "@/features/open-to-connect/components/open-to-connect-post-no-match-dialog";

type AppMatchFlow = ReturnType<typeof useAppMatchFlow>;

export type MatchmakingContextValue = Pick<
  AppMatchFlow,
  | "status"
  | "result"
  | "error"
  | "errorCode"
  | "handleFindMatch"
  | "handleCancel"
  | "restartSearch"
  | "respondToProposal"
  | "respondBusy"
  | "waitingForPeerConnect"
  | "noMatchOfferReason"
  | "noMatchSuggestionContext"
  | "dismissNoMatchOffer"
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
 * and navigation into `/space/[roomId]`. Render inside {@link SocketProvider}.
 */
export function MatchmakingProvider({ children }: { children: ReactNode }) {
  const matchFlow = useAppMatchFlow();

  const contextValue = useMemo<MatchmakingContextValue>(
    () => ({
      status: matchFlow.status,
      result: matchFlow.result,
      error: matchFlow.error,
      errorCode: matchFlow.errorCode,
      handleFindMatch: matchFlow.handleFindMatch,
      handleCancel: matchFlow.handleCancel,
      restartSearch: matchFlow.restartSearch,
      respondToProposal: matchFlow.respondToProposal,
      respondBusy: matchFlow.respondBusy,
      waitingForPeerConnect: matchFlow.waitingForPeerConnect,
      noMatchOfferReason: matchFlow.noMatchOfferReason,
      noMatchSuggestionContext: matchFlow.noMatchSuggestionContext,
      dismissNoMatchOffer: matchFlow.dismissNoMatchOffer,
    }),
    [
      matchFlow.status,
      matchFlow.result,
      matchFlow.error,
      matchFlow.errorCode,
      matchFlow.handleFindMatch,
      matchFlow.handleCancel,
      matchFlow.restartSearch,
      matchFlow.respondToProposal,
      matchFlow.respondBusy,
      matchFlow.waitingForPeerConnect,
      matchFlow.noMatchOfferReason,
      matchFlow.noMatchSuggestionContext,
      matchFlow.dismissNoMatchOffer,
    ],
  );

  const isProposalDialogOpen = matchFlow.status === "proposed";
  const isPostNoMatchOfferOpen = matchFlow.noMatchOfferReason != null;

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
      <OpenToConnectPostNoMatchDialog
        open={isPostNoMatchOfferOpen}
        onOpenChange={(open) => {
          if (!open) matchFlow.dismissNoMatchOffer();
        }}
      />
      {children}
    </MatchmakingContext.Provider>
  );
}
