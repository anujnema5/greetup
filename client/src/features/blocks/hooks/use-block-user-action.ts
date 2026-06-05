"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { toast } from "sonner";

import { getRtkMutationErrorMessage } from "@/lib/api/rtk-mutation-error";

import { useBlockUserMutation } from "../api/blocks-api";
import type { BlockUserPeer } from "../types/blocks-api.types";

type Options = {
  /** Where to land after a successful block. Defaults to Explore. Pass `null` to stay on the page. */
  redirectTo?: string | null;
  conversationId?: string | null;
};

/**
 * Confirms block via dialog, then calls the API and redirects.
 * Returns `true` when the user was blocked successfully.
 */
export function useBlockUserAction(peer: BlockUserPeer, options?: Options) {
  const router = useRouter();
  const [blockUser, { isLoading: isBlocking }] = useBlockUserMutation();
  const redirectTo = options?.redirectTo !== undefined ? options.redirectTo : "/explore";
  const conversationId = options?.conversationId;

  const block = useCallback(async (): Promise<boolean> => {
    if (!peer.userId.trim()) return false;

    try {
      await blockUser({
        targetUserId: peer.userId,
        peerUsername: peer.username,
        conversationId,
      }).unwrap();
      toast.success(`${peer.displayTitle} blocked`);
      if (redirectTo !== null) {
        router.push(redirectTo);
      }
      return true;
    } catch (error: unknown) {
      toast.error(getRtkMutationErrorMessage(error, "Could not block user"));
      return false;
    }
  }, [blockUser, conversationId, peer.displayTitle, peer.userId, peer.username, redirectTo, router]);

  return { block, isBlocking };
}
