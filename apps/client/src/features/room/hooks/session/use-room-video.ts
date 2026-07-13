"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useRoomStore } from "@/features/room/state/room.store";
import {
  SPACE_HOST_END_FOR_EVERYONE_REDIRECT_PATH,
} from "@/features/room/constants/call/call-flow";
import { shouldGuestSkipRematch } from "@/features/guest-try/lib/try-navigation";
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
  goToSpaceSearch,
  resolveApiRoomId,
} from "@/features/room/lib/navigation/space-routes";
import {
  useHostEndSpaceForEveryone,
  useKickSpaceParticipant,
  useLeaveSpaceRtc,
  useLeaveRoom,
} from "@/features/room/api/room.mutations";
import { getApiErrorMessage } from "@/lib/api/fetch-client";
import { messagesDirectConversationPath } from "@/features/connection-call/lib/call-navigation";
import { markLocalCallEndInProgress } from "@/features/room/lib/call/direct-match-leave-guard";
import type { SpaceParticipantRemoveOptions } from "@/features/room/types/call/participant-remove.types";

export type UseRoomVideoOptions = {
  skipSetup?: boolean;
  /** Native circle or 1:1 expanded to circle (same Postgres `rooms` row). */
  isDbSpaceCall?: boolean;
  spaceHostUserId?: string | null;
  /** Match / `/space/search` rematch only — never connection or open-to-connect calls. */
  canSkipAndRematch?: boolean;
  isConnectionCallSession?: boolean;
  isOpenToConnectCall?: boolean;
  connectionCallConversationId?: string | null;
};

export function useRoomVideo(roomId: string, options?: UseRoomVideoOptions) {
  const skipSetup = options?.skipSetup ?? false;
  const isDbSpaceCall = options?.isDbSpaceCall ?? false;
  const spaceHostUserId = options?.spaceHostUserId ?? null;
  const canSkipAndRematch = options?.canSkipAndRematch ?? false;
  const isConnectionCall = options?.isConnectionCallSession ?? false;
  const isOpenToConnectCall = options?.isOpenToConnectCall ?? false;
  const connectionCallConversationId = options?.connectionCallConversationId ?? null;
  const router = useRouter();
  const beginSearchingNextCall = useRoomStore((s) => s.beginSearchingNextCall);
  const endVideoSession = useRoomStore((s) => s.endVideoSession);
  const expandVideoSession = useRoomStore((s) => s.expandVideoSession);
  const minimizeVideoSession = useRoomStore((s) => s.minimizeVideoSession);
  const { data: session } = useSession();
  const matchmaking = useMatchmaking();
  const { mutateAsync: leaveRoom } = useLeaveRoom();
  const { mutateAsync: leaveSpaceRtc } = useLeaveSpaceRtc();
  const { mutateAsync: hostEndSpaceForEveryone } = useHostEndSpaceForEveryone();
  const { mutateAsync: kickSpaceParticipant } = useKickSpaceParticipant();
  const [kickingUserId, setKickingUserId] = useState<string | null>(null);
  const skipHandledRef = useRef(false);
  const endHandledRef = useRef(false);
  const hostEndHandledRef = useRef(false);

  const currentUserId = session?.user?.id ?? null;
  const isSpaceHost = Boolean(
    isDbSpaceCall && currentUserId && spaceHostUserId && currentUserId === spaceHostUserId,
  );

  useEffect(() => {
    if (skipSetup) return;
    markRoomActive();
    clearRoomMinimized();
    expandVideoSession();
  }, [expandVideoSession, skipSetup]);

  const leaveSpaceRtcOnly = useCallback(async () => {
    await leaveSpaceRtc(roomId).catch(() => {});
  }, [leaveSpaceRtc, roomId]);

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
  const goHomeAfterHostEndedSpace = useCallback(() => {
    cancelMatchmakingThenNavigate(matchmaking, router, SPACE_HOST_END_FOR_EVERYONE_REDIRECT_PATH);
  }, [matchmaking, router]);

  const dismissCallUiAndBroadcastEnd = useCallback(() => {
    clearRoomStorage();
    endVideoSession();
    broadcastRoomMessage({ type: "END_CALL" });
  }, [endVideoSession]);

  const beginSearchAfterSkip = useCallback(() => {
    if (!canSkipAndRematch) return;
    if (shouldGuestSkipRematch()) {
      returnAfterCallEnd();
      return;
    }
    if (skipHandledRef.current) return;
    skipHandledRef.current = true;
    const apiRoomId = resolveApiRoomId(roomId);

    const run = async () => {
      try {
        if (isDbSpaceCall) {
          await leaveSpaceRtcOnly();
        } else if (apiRoomId) {
          await leaveRoom({ roomId: apiRoomId });
        }
      } catch {
        /* best-effort — still enter search so the user is not stuck in-room */
      }
      beginSearchingNextCall();
      goToSpaceSearch(router);
      await matchmaking.restartSearch().catch(() => {});
    };

    void run();
  }, [
    beginSearchingNextCall,
    canSkipAndRematch,
    isDbSpaceCall,
    leaveSpaceRtcOnly,
    leaveRoom,
    matchmaking,
    returnAfterCallEnd,
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
    if (canSkipAndRematch || isConnectionCall || isOpenToConnectCall) {
      markLocalCallEndInProgress();
    }
    dismissCallUiAndBroadcastEnd();
    returnAfterCallEnd();
    if (!resolveApiRoomId(roomId)) {
      return;
    }
    if (isDbSpaceCall) {
      void leaveSpaceRtcOnly().catch(() => {});
    } else {
      const apiRoomId = resolveApiRoomId(roomId) ?? roomId;
      void leaveRoom({ roomId: apiRoomId }).catch(() => {});
    }
  }, [
    canSkipAndRematch,
    dismissCallUiAndBroadcastEnd,
    returnAfterCallEnd,
    isConnectionCall,
    isOpenToConnectCall,
    isDbSpaceCall,
    leaveSpaceRtcOnly,
    leaveRoom,
    roomId,
  ]);

  const handleHostEndSpaceForEveryone = useCallback(async () => {
    if (!isDbSpaceCall || !isSpaceHost) return;
    if (hostEndHandledRef.current) return;

    hostEndHandledRef.current = true;
    try {
      await hostEndSpaceForEveryone(roomId);
      toast.success("Space ended for everyone");
    } catch (e: unknown) {
      hostEndHandledRef.current = false;
      toast.error(getApiErrorMessage(e, "Could not end the space"));
      return;
    }

    dismissCallUiAndBroadcastEnd();
    void leaveSpaceRtcOnly().catch(() => {}).finally(goHomeAfterHostEndedSpace);
  }, [
    dismissCallUiAndBroadcastEnd,
    goHomeAfterHostEndedSpace,
    hostEndSpaceForEveryone,
    isSpaceHost,
    isDbSpaceCall,
    leaveSpaceRtcOnly,
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
      options?: SpaceParticipantRemoveOptions,
    ) => {
      if (!isDbSpaceCall || !isSpaceHost) return;
      if (kickingUserId) return;

      const restrict = options?.restrict === true;
      setKickingUserId(targetUserId);
      try {
        await kickSpaceParticipant({
          roomId,
          userId: targetUserId,
          restrict,
        });
        toast.success(
          restrict
            ? `${displayName} was removed and can't rejoin this space`
            : `${displayName} was removed from the space`,
        );
      } catch (e: unknown) {
        toast.error(getApiErrorMessage(e, "Could not remove participant"));
      } finally {
        setKickingUserId(null);
      }
    },
    [isSpaceHost, isDbSpaceCall, kickSpaceParticipant, kickingUserId, roomId],
  );

  return {
    handleEnd,
    handleHostEndSpaceForEveryone,
    handleKickParticipant: isDbSpaceCall && isSpaceHost ? handleKickParticipant : undefined,
    kickingUserId,
    isSpaceHost,
    handleSkip,
    handleMinimize,
    roomId,
  };
}
