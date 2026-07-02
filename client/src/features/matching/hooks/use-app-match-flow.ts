"use client";

import { useEffect, useCallback, useRef, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { setRoomReturnPath } from "@/features/room";
import { prefetchRoomDetail } from "@/features/room/api/room.queries";
import { prefetchRtcLiveSessionChunk } from "@/features/rtc/lib/prefetch-rtc-live-session-chunk";
import { stashSpaceRoomBootstrap } from "@/features/matching/lib/space-room-bootstrap";
import { isLocalCallEndInProgress } from "@/features/room/lib/call/direct-match-leave-guard";
import { spaceRoomPath } from "@/features/room/lib/navigation/space-routes";
import { useFindMatch } from "./useFindMatch";

/**
 * Connects matchmaking state to the router: when a match completes, sends the user to the space room
 * and remembers where they were (for minimizing the call). Exposes controls for the home hero and other screens.
 *
 * Match completion navigation uses `startTransition` so the UI stays responsive during the route change.
 */
export function useAppMatchFlow() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
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
    errorCode,
    respondBusy,
    waitingForPeerConnect,
    noMatchOfferReason,
    noMatchSuggestionContext,
    dismissNoMatchOffer,
  } = useFindMatch();

  useEffect(() => {
    if (isLocalCallEndInProgress()) return;

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

    stashSpaceRoomBootstrap(roomId, {
      peerId: result.peerId ?? null,
      score: result.matchScore != null ? String(Math.round(result.matchScore)) : null,
    });
    void prefetchRoomDetail(queryClient, roomId);
    prefetchRtcLiveSessionChunk();
    const target = spaceRoomPath(roomId);
    const alreadyOnSpaceRoute =
      pathname === target || pathname.startsWith("/space/");
    startTransition(() => {
      if (alreadyOnSpaceRoute) {
        router.replace(target);
      } else {
        router.push(target);
      }
    });
  }, [status, result, router, startTransition, pathname, queryClient]);

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
    errorCode,
    handleFindMatch,
    handleCancel,
    restartSearch,
    respondToProposal,
    respondBusy,
    waitingForPeerConnect,
    noMatchOfferReason,
    noMatchSuggestionContext,
    dismissNoMatchOffer,
  };
}
