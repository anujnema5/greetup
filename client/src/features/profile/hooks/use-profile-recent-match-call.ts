"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useCreateConnectionConversationMutation } from "@/features/chat/api/chat-api";
import { messagesConversationPath } from "@/features/chat/lib/messages-routes";
import { useConnectionCallActions } from "@/features/connection-call/hooks/use-connection-call-actions";
import type { ConnectionCallMode } from "@/features/connection-call/types/connection-call.types";
import { getRtkMutationErrorMessage } from "@/lib/api/rtk-mutation-error";

import type { ProfileRecentMatch } from "../types/profile-insights.types";

type StartCallPeer = {
  displayName: string;
  image: string | null;
};

type RecentMatchAction = "call" | "message";

export function useProfileRecentMatchCall() {
  const router = useRouter();
  const [createConversation, { isLoading: isOpeningChat }] =
    useCreateConnectionConversationMutation();
  const { startCall, isStarting: isStartingCall } = useConnectionCallActions();
  const [activePeerId, setActivePeerId] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<RecentMatchAction | null>(null);

  const isBusy = isOpeningChat || isStartingCall;

  const startRecentMatchCall = useCallback(
    async (match: ProfileRecentMatch, mode: ConnectionCallMode = "video") => {
      if (!match.isConnected) {
        toast.message("Connect first to call this person");
        return;
      }
      if (isBusy) return;

      setActivePeerId(match.peerUserId);
      setActiveAction("call");
      const peer: StartCallPeer = {
        displayName: match.displayName,
        image: match.image,
      };

      try {
        const conv = await createConversation({ targetUserId: match.peerUserId }).unwrap();
        await startCall(conv.id, match.peerUserId, mode, peer);
      } catch (error: unknown) {
        toast.error(getRtkMutationErrorMessage(error, "Could not start call"));
      } finally {
        setActivePeerId(null);
        setActiveAction(null);
      }
    },
    [createConversation, isBusy, startCall],
  );

  const openRecentMatchMessage = useCallback(
    async (match: ProfileRecentMatch) => {
      if (!match.isConnected) {
        toast.message("Connect first to message this person");
        return;
      }
      if (isBusy) return;

      setActivePeerId(match.peerUserId);
      setActiveAction("message");

      try {
        const conv = await createConversation({ targetUserId: match.peerUserId }).unwrap();
        router.push(messagesConversationPath(conv.id, conv.type));
      } catch (error: unknown) {
        toast.error(getRtkMutationErrorMessage(error, "Could not open messages"));
      } finally {
        setActivePeerId(null);
        setActiveAction(null);
      }
    },
    [createConversation, isBusy, router],
  );

  return {
    startRecentMatchCall,
    openRecentMatchMessage,
    isCallingPeerId: activeAction === "call" ? activePeerId : null,
    isMessagingPeerId: activeAction === "message" ? activePeerId : null,
    isStartingCall: activeAction === "call" && isBusy,
    isOpeningMessage: activeAction === "message" && isOpeningChat,
  };
}
