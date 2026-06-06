"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useRoomStore } from "@/features/room/state/room.store";
import {
  CIRCLE_HOST_END_FOR_EVERYONE_REDIRECT_PATH,
} from "@/features/room/constants/call/call-flow";
import {
  cancelMatchmakingThenNavigate,
  navigateAfterCallEnd,
} from "@/features/room/lib/navigation/after-call-navigation";
import {
  consumeRoomReturnPath,
  getRoomReturnPath,
} from "@/features/room/lib/session/room-return-path";
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
  useHostEndCircleForEveryone,
  useKickCircleParticipant,
  useLeaveCircleRtc,
  useLeaveRoom,
} from "@/features/room/api/room.mutations";
import { getApiErrorMessage } from "@/lib/api/fetch-client";
import { messagesDirectConversationPath } from "@/features/connection-call/lib/call-navigation";

export type UseRoomVideoOptions = {
  skipSetup?: boolean;
  /** Native circle or 1:1 expanded to circle (same Postgres `rooms` row). */
  isDbCircleCall?: boolean;
  circleHostUserId?: string | null;
  /** Match / `/circle/search` rematch only — never connection calls. */
  canSkipAndRematch?: boolean;
  isConnectionCallSession?: boolean;
  connectionCallConversationId?: string | null;
};

export function useRoomVideo(roomId: string, options?: UseRoomVideoOptions) {
  const skipSetup = options?.skipSetup ?? false;
  const isDbCircleCall = options?.isDbCircleCall ?? false;
  const circleHostUserId = options?.circleHostUserId ?? null;
  const canSkipAndRematch = options?.canSkipAndRematch ?? false;
  const isConnectionCall = options?.isConnectionCallSession ?? false;
  const connectionCallConversationId = options?.connectionCallConversationId ?? null;
  const router = useRouter();
  const beginSearchingNextCall = useRoomStore((s) => s.beginSearchingNextCall);
  const endVideoSession = useRoomStore((s) => s.endVideoSession);
  const expandVideoSession = useRoomStore((s) => s.expandVideoSession);
  const minimizeVideoSession = useRoomStore((s) => s.minimizeVideoSession);
  const { data: session } = useSession();
  const matchmaking = useMatchmaking();
  const { mutateAsync: leaveRoom } = useLeaveRoom();
  const { mutateAsync: leaveCircleRtc } = useLeaveCircleRtc();
  const { mutateAsync: hostEndCircleForEveryone } = useHostEndCircleForEveryone();
  const { mutateAsync: kickCircleParticipant } = useKickCircleParticipant();
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
    expandVideoSession();
  }, [expandVideoSession, skipSetup]);

  const leaveCircleRtcOnly = useCallback(async () => {
    await leaveCircleRtc(roomId).catch(() => {});
  }, [leaveCircleRtc, roomId]);

  /** After leave / END_CALL — conversation for DM calls, else pre-call return path. */
  const returnAfterCallEnd = useCallback(() => {
    if (isConnectionCall) {
      const dest = connectionCallConversationId
        ? messagesDirectConversationPath(connectionCallConversationId)
        : consumeRoomReturnPath("/home");
      void matchmaking.handleCancel().catch(() => {});
      router.replace(dest);
      return;
    }
    navigateAfterCallEnd(matchmaking, router);
  }, [
    connectionCallConversationId,
    isConnectionCall,
    matchmaking,
    router,
  ]);

  /** After host “end for everyone” — home. */
  const goHomeAfterHostEndedCircle = useCallback(() => {
    cancelMatchmakingThenNavigate(matchmaking, router, CIRCLE_HOST_END_FOR_EVERYONE_REDIRECT_PATH);
  }, [matchmaking, router]);

  const dismissCallUiAndBroadcastEnd = useCallback(() => {
    clearRoomStorage();
    endVideoSession();
    broadcastRoomMessage({ type: "END_CALL" });
  }, [endVideoSession]);

  const beginSearchAfterSkip = useCallback(() => {
    if (!canSkipAndRematch) return;
    if (skipHandledRef.current) return;
    skipHandledRef.current = true;
    const apiRoomId = resolveApiRoomId(roomId);

    const run = async () => {
      try {
        if (isDbCircleCall) {
          await leaveCircleRtcOnly();
        } else if (apiRoomId) {
          await leaveRoom({ roomId: apiRoomId });
        }
      } catch {
        /* best-effort — still enter search so the user is not stuck in-room */
      }
      beginSearchingNextCall();
      goToCircleSearch(router);
      await matchmaking.restartSearch().catch(() => {});
    };

    void run();
  }, [
    beginSearchingNextCall,
    canSkipAndRematch,
    isDbCircleCall,
    leaveCircleRtcOnly,
    leaveRoom,
    matchmaking,
    roomId,
    router,
  ]);

  useEffect(() => {
    if (skipSetup) return;
    const unsub = subscribeRoomChannel((msg) => {
      if (msg.type === "END_CALL") {
        clearRoomStorage();
        endVideoSession();
        if (!endHandledRef.current) {
          returnAfterCallEnd();
        }
      }
      if (msg.type === "SKIP_CALL") {
        if (canSkipAndRematch) beginSearchAfterSkip();
      }
    });
    return unsub;
  }, [beginSearchAfterSkip, canSkipAndRematch, endVideoSession, returnAfterCallEnd, skipSetup]);

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
      returnAfterCallEnd();
      return;
    }
    if (isDbCircleCall) {
      void leaveCircleRtcOnly().catch(() => {}).finally(returnAfterCallEnd);
    } else {
      const apiRoomId = resolveApiRoomId(roomId) ?? roomId;
      void leaveRoom({ roomId: apiRoomId })
        .catch(() => {})
        .finally(returnAfterCallEnd);
    }
  }, [
    dismissCallUiAndBroadcastEnd,
    returnAfterCallEnd,
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
      await hostEndCircleForEveryone(roomId);
      toast.success("Circle ended for everyone");
    } catch (e: unknown) {
      hostEndHandledRef.current = false;
      toast.error(getApiErrorMessage(e, "Could not end the circle"));
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
    if (!canSkipAndRematch) return;
    broadcastRoomMessage({ type: "SKIP_CALL" });
    beginSearchAfterSkip();
  }, [beginSearchAfterSkip, canSkipAndRematch]);

  const handleMinimize = useCallback(() => {
    markRoomMinimized();
    minimizeVideoSession();
    const dest = getRoomReturnPath() ?? "/home";
    router.replace(dest);
  }, [minimizeVideoSession, router]);

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
        });
        toast.success(
          restrict
            ? `${displayName} was removed and can't rejoin this circle`
            : `${displayName} was removed from the circle`,
        );
      } catch (e: unknown) {
        toast.error(getApiErrorMessage(e, "Could not remove participant"));
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
