"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { useCreateConnectionConversation } from "@/features/chat/api/chat.mutations";
import { getApiErrorMessage } from "@/lib/api/fetch-client";
import { messagesConversationPath } from "@/features/chat/lib/messages-routes";
import { useConnectionCallActions } from "@/features/connection-call/hooks/use-connection-call-actions";
import type { ConnectionCallMode } from "@/features/connection-call/types/connection-call.types";

import { publicProfileShareUrl } from "../lib/public-profile-share-url";
import type { PublicProfilePeer } from "../types/public-profile-actions.types";

type Options = {
  peer: PublicProfilePeer;
  /** Message / call require an accepted connection. */
  messagingEnabled: boolean;
};

export function usePublicProfileInteractions({ peer, messagingEnabled }: Options) {
  const router = useRouter();
  const { mutateAsync: createConversation, isPending: isOpeningChat } =
    useCreateConnectionConversation();
  const { startCall, isStarting: isStartingCall } = useConnectionCallActions();
  const [isBusy, setIsBusy] = useState(false);

  const guardMessaging = useCallback((): boolean => {
    if (!messagingEnabled) {
      toast.message("Connect first to message or call");
      return false;
    }
    if (isBusy || isOpeningChat || isStartingCall) return false;
    return true;
  }, [isBusy, isOpeningChat, isStartingCall, messagingEnabled]);

  const openConversation = useCallback(async () => {
    if (!guardMessaging()) return;
    setIsBusy(true);
    try {
      const conv = await createConversation({ targetUserId: peer.userId });
      router.push(messagesConversationPath(conv.id, conv.type));
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Could not open messages"));
    } finally {
      setIsBusy(false);
    }
  }, [createConversation, guardMessaging, peer.userId, router]);

  const startProfileCall = useCallback(
    async (mode: ConnectionCallMode) => {
      if (!guardMessaging()) return;
      setIsBusy(true);
      try {
        const conv = await createConversation({ targetUserId: peer.userId });
        await startCall(conv.id, peer.userId, mode, {
          displayName: peer.displayTitle,
          image: peer.primaryImage,
        });
      } catch (error: unknown) {
        toast.error(getApiErrorMessage(error, "Could not start call"));
      } finally {
        setIsBusy(false);
      }
    },
    [
      createConversation,
      guardMessaging,
      peer.displayTitle,
      peer.primaryImage,
      peer.userId,
      startCall,
    ],
  );

  const copyProfileLink = useCallback(async () => {
    const url = publicProfileShareUrl(peer.username);
    if (!url) {
      toast.error("Profile link unavailable");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Profile link copied");
    } catch {
      toast.error("Could not copy link");
    }
  }, [peer.username]);

  return {
    openConversation,
    startProfileCall,
    copyProfileLink,
    isOpeningChat: isOpeningChat || isBusy,
    isStartingCall,
  };
}
