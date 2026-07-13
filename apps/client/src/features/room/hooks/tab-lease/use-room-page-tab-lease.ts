"use client";



import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { useRoomStore } from "@/features/room/state/room.store";

import { leaveSpaceRtcKeepalive, leaveRoomKeepalive } from "@/features/room/api/room.mutations";

import {

  clearRoomTabLeaseIfOwner,

  getOrCreateTabInstanceId,

  isOtherTabActiveInSameRoom,

  writeRoomTabLease,

} from "@/features/room/lib/session/room-tab-lease";

import { clearRoomStorage, isRoomMinimizedMarked } from "@/features/room/lib/session/room-sync";

import { toast } from "sonner";

import {
  SPACE_SEARCH_PATH,
  isSpaceSearchRoomId,
  spaceRoomPath,
} from "@/features/room/lib/navigation/space-routes";



const DUPLICATE_TAB_TOAST = "You're already in this room.";



export type RoomPageLeaseRouter = { replace: (href: string) => void };



type UseRoomPageTabLeaseArgs = {

  roomId: string;

  currentUserId: string | null;

  sessionPending: boolean;

  router: RoomPageLeaseRouter;

};



/**

 * `/space/[roomId]` only: cross-tab lease in localStorage, room `enterRoomPage`, unload cleanup.

 * Redirects to home with a toast if another tab already holds this room for the same user.

 */

export function useRoomPageTabLease({

  roomId,

  currentUserId,

  sessionPending,

  router,

}: UseRoomPageTabLeaseArgs) {

  const enterRoomPage = useRoomStore((s) => s.enterRoomPage);

  const resetRoomState = useRoomStore((s) => s.resetRoomState);

  const [duplicateTabRedirect, setDuplicateTabRedirect] = useState(false);

  const blockedAsDuplicateTabRef = useRef(false);

  const duplicateToastSentRef = useRef(false);

  const userIdRef = useRef<string | null>(null);

  const tabIdRef = useRef<string>(getOrCreateTabInstanceId());

  const roomIdRef = useRef(roomId);

  const pendingLeaveCleanupRef = useRef<ReturnType<typeof setTimeout> | null>(null);



  useLayoutEffect(() => {

    roomIdRef.current = roomId;

    userIdRef.current = currentUserId;

    if (!roomId || sessionPending || !currentUserId) return;



    if (isSpaceSearchRoomId(roomId)) {

      enterRoomPage({ roomId });

      return;

    }



    const tabId = getOrCreateTabInstanceId();

    tabIdRef.current = tabId;



    if (isOtherTabActiveInSameRoom(currentUserId, roomId, tabId)) {

      blockedAsDuplicateTabRef.current = true;

      queueMicrotask(() => setDuplicateTabRedirect(true));

      return;

    }



    enterRoomPage({ roomId });

    writeRoomTabLease(currentUserId, { tabId, roomId, ts: Date.now() });

  }, [roomId, sessionPending, currentUserId, enterRoomPage]);



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

    if (pendingLeaveCleanupRef.current != null) {

      clearTimeout(pendingLeaveCleanupRef.current);

      pendingLeaveCleanupRef.current = null;

    }



    return () => {

      if (blockedAsDuplicateTabRef.current) return;

      if (isRoomMinimizedMarked()) return;



      const uid = userIdRef.current;

      const tabId = tabIdRef.current;



      if (pendingLeaveCleanupRef.current != null) {

        clearTimeout(pendingLeaveCleanupRef.current);

      }



      pendingLeaveCleanupRef.current = setTimeout(() => {

        pendingLeaveCleanupRef.current = null;

        if (blockedAsDuplicateTabRef.current) return;

        if (isRoomMinimizedMarked()) return;



        const rid = roomIdRef.current;



        try {

          const path = window.location.pathname;

          if (

            path === SPACE_SEARCH_PATH ||
            path === spaceRoomPath(rid) ||
            path.startsWith(`${spaceRoomPath(rid)}/`)

          ) {

            return;

          }

        } catch {

          /* ignore */

        }



        if (uid) clearRoomTabLeaseIfOwner(uid, tabId);

        leaveSpaceRtcKeepalive(rid);

        leaveRoomKeepalive();

        clearRoomStorage();

        resetRoomState();

      }, 0);

    };

  }, [resetRoomState, roomId]);



  return { duplicateTabRedirect, clearLeaseIfOwner };

}

