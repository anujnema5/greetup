"use client";

import { useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useAppDispatch } from "@/lib/redux/hooks";
import {
  beginSearchingNextCall,
  endVideoSession,
  expandVideoSession,
  minimizeVideoSession,
} from "@/lib/redux/slices/room-slice";
import { MATCHMAKING_HUB_PATH } from "@/features/room/constants/call-flow";
import { getRoomReturnPath } from "@/features/room/lib/room-return-path";
import {
  clearRoomStorage,
  clearRoomMinimized,
  markRoomActive,
  markRoomMinimized,
  subscribeRoomChannel,
  broadcastRoomMessage,
} from "@/features/room/lib/room-sync";
import { useMatchmaking } from "@/features/matching";
import {
  useHostEndCircleForEveryoneMutation,
  useLeaveCircleRtcMutation,
  useLeaveRoomMutation,
} from "@/features/room/api/room-api";
import { getRtkMutationErrorMessage } from "@/lib/api/rtk-mutation-error";

export type UseRoomVideoOptions = {
  skipSetup?: boolean;
  /** DB-backed circle (`sessionKind: "db_room"`) — uses `/room/:id/leave-circle-rtc` instead of matchmaking leave. */
  isDbCircleCall?: boolean;
  /** Circle host user id — used for explicit “end circle for everyone” vs leaving the call yourself. */
  circleHostUserId?: string | null;
};

/**
 * Full-screen room video: active markers, BroadcastChannel, end / skip / minimize.
 * Mount only under `/circle/[roomId]` when video UI is shown (`startVideoSession` already dispatched).
 *
 * Pass `{ skipSetup: true }` when using from the minimized dock so the hook
 * only provides action handlers without claiming room-active markers or
 * subscribing to the BroadcastChannel (the room page owns those).
 */
export function useRoomVideo(roomId: string, options?: UseRoomVideoOptions) {
  const skipSetup = options?.skipSetup ?? false;
  const isDbCircleCall = options?.isDbCircleCall ?? false;
  const circleHostUserId = options?.circleHostUserId ?? null;
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { data: session } = useSession();
  const matchmaking = useMatchmaking();
  const [leaveRoom] = useLeaveRoomMutation();
  const [leaveCircleRtc] = useLeaveCircleRtcMutation();
  const [hostEndCircleForEveryone] = useHostEndCircleForEveryoneMutation();
  const skipHandledRef = useRef(false);
  const endHandledRef = useRef(false);
  const hostEndHandledRef = useRef(false);

  const currentUserId = session?.user?.id ?? null;
  const isCircleHost = Boolean(
    isDbCircleCall && currentUserId && circleHostUserId && currentUserId === circleHostUserId,
  );

  useEffect(() => {
    if (skipSetup) return;
    markRoomActive();
    clearRoomMinimized();
    dispatch(expandVideoSession());
  }, [dispatch, skipSetup]);

  const leaveCircleRtcOnly = useCallback(async () => {
    await leaveCircleRtc(roomId).unwrap().catch(() => {});
  }, [leaveCircleRtc, roomId]);

  const beginSearchAfterSkip = useCallback(() => {
    if (skipHandledRef.current) return;
    skipHandledRef.current = true;
    dispatch(beginSearchingNextCall());
    if (isDbCircleCall) {
      void leaveCircleRtcOnly()
        .catch(() => {})
        .finally(() => {
          void matchmaking.restartSearch();
        });
    } else {
      void leaveRoom()
        .unwrap()
        .catch(() => {})
        .finally(() => {
          void matchmaking.restartSearch();
        });
    }
  }, [dispatch, isDbCircleCall, leaveRoom, matchmaking, leaveCircleRtcOnly]);

  useEffect(() => {
    if (skipSetup) return;
    const unsub = subscribeRoomChannel((msg) => {
      if (msg.type === "END_CALL") {
        clearRoomStorage();
        dispatch(endVideoSession());
        void matchmaking
          .handleCancel()
          .catch(() => {})
          .finally(() => {
            router.replace(MATCHMAKING_HUB_PATH);
          });
      }
      if (msg.type === "SKIP_CALL") {
        beginSearchAfterSkip();
      }
    });
    return unsub;
  }, [beginSearchAfterSkip, dispatch, matchmaking, router, skipSetup]);

  useEffect(() => {
    if (!skipHandledRef.current) return;
    if (matchmaking.status !== "searching" && matchmaking.status !== "proposed") return;
    skipHandledRef.current = false;
  }, [matchmaking.status]);

  const handleEnd = useCallback(() => {
    if (endHandledRef.current) return;
    endHandledRef.current = true;
    clearRoomStorage();
    dispatch(endVideoSession());
    broadcastRoomMessage({ type: "END_CALL" });
    if (isDbCircleCall) {
      void leaveCircleRtcOnly()
        .catch(() => {})
        .finally(() => {
          void matchmaking
            .handleCancel()
            .catch(() => {})
            .finally(() => {
              router.replace(MATCHMAKING_HUB_PATH);
            });
        });
    } else {
      void matchmaking
        .handleCancel()
        .catch(() => {})
        .finally(() => {
          void leaveRoom()
            .unwrap()
            .catch(() => {})
            .finally(() => {
              router.replace(MATCHMAKING_HUB_PATH);
            });
        });
    }
  }, [dispatch, isDbCircleCall, leaveRoom, matchmaking, router, leaveCircleRtcOnly]);

  const handleHostEndCircleForEveryone = useCallback(() => {
    if (!isDbCircleCall || !isCircleHost) return;
    if (hostEndHandledRef.current) return;
    if (
      !window.confirm(
        "End this circle for everyone? People in the call will be disconnected and the circle will close.",
      )
    ) {
      return;
    }
    hostEndHandledRef.current = true;
    void (async () => {
      try {
        await hostEndCircleForEveryone(roomId).unwrap();
        toast.success("Circle ended for everyone");
      } catch (e: unknown) {
        hostEndHandledRef.current = false;
        toast.error(getRtkMutationErrorMessage(e, "Could not end the circle"));
        return;
      }
      clearRoomStorage();
      dispatch(endVideoSession());
      broadcastRoomMessage({ type: "END_CALL" });
      void matchmaking
        .handleCancel()
        .catch(() => {})
        .finally(() => {
          router.replace(MATCHMAKING_HUB_PATH);
        });
    })();
  }, [
    dispatch,
    hostEndCircleForEveryone,
    isCircleHost,
    isDbCircleCall,
    matchmaking,
    roomId,
    router,
  ]);

  const handleSkip = useCallback(() => {
    broadcastRoomMessage({ type: "SKIP_CALL" });
    beginSearchAfterSkip();
  }, [beginSearchAfterSkip]);

  const handleMinimize = useCallback(() => {
    markRoomMinimized();
    dispatch(minimizeVideoSession());
    const dest = getRoomReturnPath() ?? "/home";
    router.replace(dest);
  }, [dispatch, router]);

  return { handleEnd, handleHostEndCircleForEveryone, handleSkip, handleMinimize, roomId };
}
