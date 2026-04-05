"use client";

import { useEffect, useCallback, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { setRoomReturnPath } from "@/features/room";
import { useFindMatch } from "@/features/matching";

/**
 * Wires matchmaking to navigation (save return path, go to `/room/[id]`) and exposes stable handlers for the hero UI.
 * Navigation after a match runs inside `startTransition` so the UI stays responsive during the route change.
 */
export function useDashboardMatchFlow() {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const {
    findAMatch,
    cancelSearch,
    respondToProposal,
    status,
    result,
    error,
    respondBusy,
    waitingForPeerConnect,
  } = useFindMatch();

  useEffect(() => {
    if (status !== "matched" || !result?.roomId) return;
    setRoomReturnPath(pathname);
    const params = new URLSearchParams();
    if (result.peerId) params.set("peer", result.peerId);
    if (result.matchScore != null) params.set("score", String(Math.round(result.matchScore)));
    const url = `/circle/${result.roomId}?${params.toString()}`;
    startTransition(() => {
      router.push(url);
    });
  }, [status, result, router, pathname, startTransition]);

  const handleFindMatch = useCallback(() => {
    if (status === "idle" || status === "error") findAMatch();
  }, [status, findAMatch]);

  const handleCancel = useCallback(() => {
    cancelSearch();
  }, [cancelSearch]);

  return {
    status,
    result,
    error,
    handleFindMatch,
    handleCancel,
    respondToProposal,
    respondBusy,
    waitingForPeerConnect,
  };
}
