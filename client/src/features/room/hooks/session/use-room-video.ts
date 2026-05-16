"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  CIRCLE_HOST_END_FOR_EVERYONE_REDIRECT_PATH,
  MATCHMAKING_HUB_PATH,
} from "@/features/room/constants/call/call-flow";
import { cancelMatchmakingThenNavigate } from "@/features/room/lib/navigation/after-call-navigation";
import { getRoomReturnPath } from "@/features/room/lib/session/room-return-path";
import {
  broadcastRoomMessage,
  clearRoomMinimized,
  clearRoomStorage,
  markRoomActive,
  markRoomMinimized,
  subscribeRoomChannel,
} from "@/features/room/lib/session/room-sync";
import { useMatchmaking } from "@/features/matching";
import {
  goToCircleSearch,
  resolveApiRoomId,
} from "@/features/room/lib/navigation/circle-routes";
import {
  useHostEndCircleForEveryoneMutation,
  useKickCircleParticipantMutation,
  useLeaveCircleRtcMutation,
  useLeaveRoomMutation,
} from "@/features/room/api/room-api";
import { getRtkMutationErrorMessage } from "@/lib/api/rtk-mutation-error";

export type UseRoomVideoOptions = {
  skipSetup?: boolean;
  /** Native circle or 1:1 expanded to circle (same Postgres `rooms` row). */
  isDbCircleCall?: boolean;
  circleHostUserId?: string | null;
};

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
  const [kickCircleParticipant] = useKickCircleParticipantMutation();
  const [kickingUserId, setKickingUserId] = useState<string | null>(null);
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

  /** After leave / END_CALL — explore hub. */
  const goToExploreHub = useCallback(() => {
    cancelMatchmakingThenNavigate(matchmaking, router, MATCHMAKING_HUB_PATH);
  }, [matchmaking, router]);

  /** After host “end for everyone” — home. */
  const goHomeAfterHostEndedCircle = useCallback(() => {
    cancelMatchmakingThenNavigate(matchmaking, router, CIRCLE_HOST_END_FOR_EVERYONE_REDIRECT_PATH);
  }, [matchmaking, router]);

  const dismissCallUiAndBroadcastEnd = useCallback(() => {
    clearRoomStorage();
    dispatch(endVideoSession());
    broadcastRoomMessage({ type: "END_CALL" });
  }, [dispatch]);

  const beginSearchAfterSkip = useCallback(() => {
    if (skipHandledRef.current) return;
    skipHandledRef.current = true;
    const apiRoomId = resolveApiRoomId(roomId);
    dispatch(beginSearchingNextCall());
    goToCircleSearch(router);
    if (isDbCircleCall) {
      void leaveCircleRtcOnly()
        .catch(() => {})
        .finally(() => {
          void matchmaking.restartSearch();
        });
    } else if (apiRoomId) {
      void leaveRoom({ roomId: apiRoomId })
        .unwrap()
        .catch(() => {})
        .finally(() => {
          void matchmaking.restartSearch();
        });
    } else {
      void matchmaking.restartSearch();
    }
  }, [dispatch, isDbCircleCall, leaveCircleRtcOnly, leaveRoom, matchmaking, roomId, router]);

  useEffect(() => {
    if (skipSetup) return;
    const unsub = subscribeRoomChannel((msg) => {
      if (msg.type === "END_CALL") {
        clearRoomStorage();
        dispatch(endVideoSession());
        goToExploreHub();
      }
      if (msg.type === "SKIP_CALL") {
        beginSearchAfterSkip();
      }
    });
    return unsub;
  }, [beginSearchAfterSkip, dispatch, goToExploreHub, skipSetup]);

  useEffect(() => {
    if (!skipHandledRef.current) return;
    if (matchmaking.status !== "searching" && matchmaking.status !== "proposed") return;
    skipHandledRef.current = false;
  }, [matchmaking.status]);

  const handleEnd = useCallback(() => {
    if (endHandledRef.current) return;
    endHandledRef.current = true;
    dismissCallUiAndBroadcastEnd();
    if (!resolveApiRoomId(roomId)) {
      goToExploreHub();
      return;
    }
    if (isDbCircleCall) {
      void leaveCircleRtcOnly().catch(() => {}).finally(goToExploreHub);
    } else {
      void leaveRoom({ roomId })
        .unwrap()
        .catch(() => {})
        .finally(goToExploreHub);
    }
  }, [
    dismissCallUiAndBroadcastEnd,
    goToExploreHub,
    isDbCircleCall,
    leaveCircleRtcOnly,
    leaveRoom,
    roomId,
  ]);

  const handleHostEndCircleForEveryone = useCallback(async () => {
    if (!isDbCircleCall || !isCircleHost) return;
    if (hostEndHandledRef.current) return;

    hostEndHandledRef.current = true;
    try {
      await hostEndCircleForEveryone(roomId).unwrap();
      toast.success("Circle ended for everyone");
    } catch (e: unknown) {
      hostEndHandledRef.current = false;
      toast.error(getRtkMutationErrorMessage(e, "Could not end the circle"));
      return;
    }

    dismissCallUiAndBroadcastEnd();
    void leaveCircleRtcOnly().catch(() => {}).finally(goHomeAfterHostEndedCircle);
  }, [
    dismissCallUiAndBroadcastEnd,
    goHomeAfterHostEndedCircle,
    hostEndCircleForEveryone,
    isCircleHost,
    isDbCircleCall,
    leaveCircleRtcOnly,
    roomId,
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

  const handleKickParticipant = useCallback(
    async (
      targetUserId: string,
      displayName: string,
      options?: { restrict?: boolean },
    ) => {
      if (!isDbCircleCall || !isCircleHost) return;
      if (kickingUserId) return;

      const restrict = options?.restrict === true;
      setKickingUserId(targetUserId);
      try {
        await kickCircleParticipant({
          roomId,
          userId: targetUserId,
          restrict,
        }).unwrap();
        toast.success(
          restrict
            ? `${displayName} was removed and can't rejoin this circle`
            : `${displayName} was removed from the circle`,
        );
      } catch (e: unknown) {
        toast.error(getRtkMutationErrorMessage(e, "Could not remove participant"));
      } finally {
        setKickingUserId(null);
      }
    },
    [isCircleHost, isDbCircleCall, kickCircleParticipant, kickingUserId, roomId],
  );

  return {
    handleEnd,
    handleHostEndCircleForEveryone,
    handleKickParticipant: isDbCircleCall && isCircleHost ? handleKickParticipant : undefined,
    kickingUserId,
    isCircleHost,
    handleSkip,
    handleMinimize,
    roomId,
  };
}
