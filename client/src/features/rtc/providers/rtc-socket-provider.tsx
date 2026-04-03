"use client";

import { createContext, useContext, useMemo } from "react";
import { useSession } from "@/lib/auth-client";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectActiveRoomId } from "@/lib/redux/selectors/room-selectors";
import { deriveRoomRtcState } from "@/features/matching/utils/derive-room-rtc-state";
import { useGetRtcTokenQuery } from "../api/rtc-api";
import { useRtcSocket } from "../hooks/use-rtc-socket";
import type { RoomRtcState } from "@/features/matching/types/room.types";
import type { UseRtcSocketReturn } from "../hooks/use-rtc-socket";

export type RtcSocketContextValue = RoomRtcState &
  UseRtcSocketReturn & {
    /** Room id used for the RTC token + socket (Redux `activeRoomId`). */
    rtcRoomId: string | null;
  };

const RtcSocketContext = createContext<RtcSocketContextValue | null>(null);

/**
 * Owns the mediasoup / rtc-service Socket.IO connection for the active circle room.
 * Lives under the root layout so the socket stays connected when the user minimizes
 * the call and navigates away from `/circle/[roomId]` (only the room page unmounts).
 */
export function RtcSocketProvider({ children }: { children: React.ReactNode }) {
  const activeRoomId = useAppSelector(selectActiveRoomId);
  const { data: session, isPending: sessionPending } = useSession();

  const skipRtcToken = !activeRoomId || sessionPending || !session?.user?.id;

  const rtcQuery = useGetRtcTokenQuery(activeRoomId ?? "", {
    skip: skipRtcToken,
  });
  
  const rtc = deriveRoomRtcState(skipRtcToken, rtcQuery);
  const { rtcSocket, rtcSocketState } = useRtcSocket(rtc.rtcToken ?? null);

  const value = useMemo<RtcSocketContextValue>(
    () => ({
      rtcToken: rtc.rtcToken,
      rtcTokenExpiresInSec: rtc.rtcTokenExpiresInSec,
      rtcTokenLoading: rtc.rtcTokenLoading,
      rtcTokenError: rtc.rtcTokenError,
      rtcTokenSkipped: rtc.rtcTokenSkipped,
      rtcSocket,
      rtcSocketState,
      rtcRoomId: activeRoomId,
    }),
    [
      rtc.rtcToken,
      rtc.rtcTokenExpiresInSec,
      rtc.rtcTokenLoading,
      rtc.rtcTokenError,
      rtc.rtcTokenSkipped,
      rtcSocket,
      rtcSocketState,
      activeRoomId,
    ],
  );

  return (
    <RtcSocketContext.Provider value={value}>{children}</RtcSocketContext.Provider>
  );
}

export function useRtcSocketContext(): RtcSocketContextValue {
  const ctx = useContext(RtcSocketContext);
  if (!ctx) {
    throw new Error("useRtcSocketContext must be used within RtcSocketProvider");
  }
  return ctx;
}
