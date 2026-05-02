"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { AppDispatch } from "@/lib/redux/store";
import { enterRoomPage, resetRoomState } from "@/lib/redux/slices/room-slice";
import { leaveRoomKeepalive } from "@/features/room/api/room-api";
import {
  clearRoomTabLeaseIfOwner,
  getOrCreateTabInstanceId,
  isOtherTabActiveInSameRoom,
  writeRoomTabLease,
} from "@/features/room/lib/room-tab-lease";
import { clearRoomStorage, isRoomMinimizedMarked } from "@/features/room/lib/room-sync";
import { toast } from "sonner";

const DUPLICATE_TAB_TOAST = "You're already in this room.";

export type RoomPageLeaseRouter = { replace: (href: string) => void };

type UseRoomPageTabLeaseArgs = {
  roomId: string;
  currentUserId: string | null;
  sessionPending: boolean;
  dispatch: AppDispatch;
  router: RoomPageLeaseRouter;
};

/**
 * `/circle/[roomId]` only: cross-tab lease in localStorage, Redux `enterRoomPage`, unload cleanup.
 * Redirects to home with a toast if another tab already holds this room for the same user.
 */
export function useRoomPageTabLease({
  roomId,
  currentUserId,
  sessionPending,
  dispatch,
  router,
}: UseRoomPageTabLeaseArgs) {
  const [duplicateTabRedirect, setDuplicateTabRedirect] = useState(false);
  const blockedAsDuplicateTabRef = useRef(false);
  const duplicateToastSentRef = useRef(false);
  const userIdRef = useRef<string | null>(null);
  const tabIdRef = useRef<string>(getOrCreateTabInstanceId());

  useLayoutEffect(() => {
    userIdRef.current = currentUserId;
    if (!roomId || sessionPending || !currentUserId) return;

    const tabId = getOrCreateTabInstanceId();
    tabIdRef.current = tabId;

    if (isOtherTabActiveInSameRoom(currentUserId, roomId, tabId)) {
      blockedAsDuplicateTabRef.current = true;
      queueMicrotask(() => setDuplicateTabRedirect(true));
      return;
    }

    dispatch(enterRoomPage({ roomId }));
    writeRoomTabLease(currentUserId, { tabId, roomId, ts: Date.now() });
  }, [roomId, sessionPending, currentUserId, dispatch]);

  useEffect(() => {
    if (!duplicateTabRedirect) return;
    if (!duplicateToastSentRef.current) {
      duplicateToastSentRef.current = true;
      toast.error(DUPLICATE_TAB_TOAST);
    }
    router.replace("/home");
  }, [duplicateTabRedirect, router]);

  const clearLeaseIfOwner = useCallback(() => {
    const uid = userIdRef.current;
    if (uid) clearRoomTabLeaseIfOwner(uid, tabIdRef.current);
  }, []);

  useEffect(() => {
    const releaseLeaseOnUnload = () => {
      const uid = userIdRef.current;
      if (uid) clearRoomTabLeaseIfOwner(uid, tabIdRef.current);
    };
    const onBeforeUnload = () => {
      leaveRoomKeepalive();
      releaseLeaseOnUnload();
    };
    const onPageHide = () => {
      leaveRoomKeepalive();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (blockedAsDuplicateTabRef.current) return;
      if (isRoomMinimizedMarked()) return;
      const uid = userIdRef.current;
      if (uid) clearRoomTabLeaseIfOwner(uid, tabIdRef.current);
      leaveRoomKeepalive();
      clearRoomStorage();
      dispatch(resetRoomState());
    };
  }, [dispatch]);

  return { duplicateTabRedirect, clearLeaseIfOwner };
}
