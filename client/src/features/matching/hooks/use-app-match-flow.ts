"use client";

import { useEffect, useCallback, useRef, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { setRoomReturnPath } from "@/features/room";
import { useFindMatch } from "./useFindMatch";
import type { MatchResult } from "./useFindMatch";

/** `/circle/[roomId]` with optional peer + score query params for the video room. */
function circleRoomUrl(roomId: string, match: Pick<MatchResult, "peerId" | "matchScore">) {
  const params = new URLSearchParams();
  if (match.peerId) params.set("peer", match.peerId);
  if (match.matchScore != null) params.set("score", String(Math.round(match.matchScore)));
  const query = params.toString();
  return query ? `/circle/${roomId}?${query}` : `/circle/${roomId}`;
}

/**
 * Connects matchmaking state to the router: when a match completes, sends the user to the circle room
 * and remembers where they were (for minimizing the call). Exposes controls for the home hero and other screens.
 *
 * Match completion navigation uses `startTransition` so the UI stays responsive during the route change.
 */
export function useAppMatchFlow() {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  /**
   * After we auto-open a room once, `useFindMatch` may still report `matched` even after the user ends the call.
   * Without this guard, any stray effect re-run could push them back into the room.
   */
  const roomIdWeAlreadyOpenedRef = useRef<string | null>(null);

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
    const roomId = result?.roomId;
    const matchIsReady = status === "matched" && roomId != null;

    if (!matchIsReady || result == null) {
      roomIdWeAlreadyOpenedRef.current = null;
      return;
    }

    if (roomIdWeAlreadyOpenedRef.current === roomId) {
      return;
    }

    roomIdWeAlreadyOpenedRef.current = roomId;

    setRoomReturnPath(pathname);

    const url = circleRoomUrl(roomId, result);
    startTransition(() => {
      router.push(url);
    });
  }, [status, result, router, startTransition]);

  const handleFindMatch = useCallback(() => {
    if (status === "idle" || status === "error") findAMatch();
  }, [status, findAMatch]);

  const handleCancel = useCallback(async () => {
    await cancelSearch();
  }, [cancelSearch]);

  const restartSearch = useCallback(async () => {
    await cancelSearch();
    await findAMatch();
  }, [cancelSearch, findAMatch]);

  return {
    status,
    result,
    error,
    handleFindMatch,
    handleCancel,
    restartSearch,
    respondToProposal,
    respondBusy,
    waitingForPeerConnect,
  };
}
