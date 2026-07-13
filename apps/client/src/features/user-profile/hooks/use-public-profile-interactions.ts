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
  /** Voice/video require an accepted connection. */
  callsEnabled: boolean;
};

export function usePublicProfileInteractions({ peer, callsEnabled }: Options) {
  const router = useRouter();
  const { mutateAsync: createConversation, isPending: isOpeningChat } =
    useCreateConnectionConversation();
  const { startCall, isStarting: isStartingCall } = useConnectionCallActions();
  const [isBusy, setIsBusy] = useState(false);

  const guardCalls = useCallback((): boolean => {
    if (!callsEnabled) {
      toast.message("Connect first to call");
      return false;
    }
    if (isBusy || isOpeningChat || isStartingCall) return false;
    return true;
  }, [callsEnabled, isBusy, isOpeningChat, isStartingCall]);

  const openConversation = useCallback(async () => {
    if (isBusy || isOpeningChat || isStartingCall) return;
    setIsBusy(true);
    try {
      const conv = await createConversation({ targetUserId: peer.userId });
      router.push(messagesConversationPath(conv.id, conv.type));
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Could not open messages"));
    } finally {
      setIsBusy(false);
    }
  }, [createConversation, isBusy, isOpeningChat, isStartingCall, peer.userId, router]);

  const startProfileCall = useCallback(
    async (mode: ConnectionCallMode) => {
      if (!guardCalls()) return;
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
      guardCalls,
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
