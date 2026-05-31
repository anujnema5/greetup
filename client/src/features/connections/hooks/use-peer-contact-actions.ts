"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useCreateConnectionConversationMutation } from "@/features/chat/api/chat-api";
import { messagesConversationPath } from "@/features/chat/lib/messages-routes";
import { useConnectionCallActions } from "@/features/connection-call/hooks/use-connection-call-actions";
import type { ConnectionCallMode } from "@/features/connection-call/types/connection-call.types";
import { getRtkMutationErrorMessage } from "@/lib/api/rtk-mutation-error";

export type PeerContactTarget = {
  peerUserId: string;
  displayName: string;
  image: string | null;
};

type PeerAction = "call" | "message";

export function usePeerContactActions() {
  const router = useRouter();
  const [createConversation, { isLoading: isOpeningChat }] =
    useCreateConnectionConversationMutation();
  const { startCall, isStarting: isStartingCall } = useConnectionCallActions();
  const [activePeerId, setActivePeerId] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<PeerAction | null>(null);

  const isBusy = isOpeningChat || isStartingCall;

  const startPeerCall = useCallback(
    async (peer: PeerContactTarget, mode: ConnectionCallMode = "video") => {
      if (isBusy) return;

      setActivePeerId(peer.peerUserId);
      setActiveAction("call");

      try {
        const conv = await createConversation({ targetUserId: peer.peerUserId }).unwrap();
        await startCall(conv.id, peer.peerUserId, mode, {
          displayName: peer.displayName,
          image: peer.image,
        });
      } catch (error: unknown) {
        toast.error(getRtkMutationErrorMessage(error, "Could not start call"));
      } finally {
        setActivePeerId(null);
        setActiveAction(null);
      }
    },
    [createConversation, isBusy, startCall],
  );

  const openPeerMessage = useCallback(
    async (peer: PeerContactTarget) => {
      if (isBusy) return;

      setActivePeerId(peer.peerUserId);
      setActiveAction("message");

      try {
        const conv = await createConversation({ targetUserId: peer.peerUserId }).unwrap();
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
    startPeerCall,
    openPeerMessage,
    isCallingPeerId: activeAction === "call" ? activePeerId : null,
    isMessagingPeerId: activeAction === "message" ? activePeerId : null,
    isStartingCall: activeAction === "call" && isBusy,
    isOpeningMessage: activeAction === "message" && isOpeningChat,
  };
}
