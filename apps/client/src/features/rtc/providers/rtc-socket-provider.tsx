"use client";

import { lazy, Suspense, useEffect, useMemo } from "react";
import { useSession } from "@/lib/auth-client";
import { useMyProfile } from "@/features/profile-setup/api";
import { useRoomTabLeaseRtcSync } from "@/features/room/hooks";
import {
  selectActiveRoomId,
  selectIsVideoSessionActive,
  selectRtcPrimaryRemoteUserId,
  useRoomStore,
} from "@/features/room/state/room.store";
import {
  createConnectingRtcSocketContextValue,
  createIdleRtcSocketContextValue,
} from "@/features/rtc/lib/rtc-idle-mediasoup-state";
import { loadRtcLiveSessionProviderLazy } from "@/features/rtc/lib/prefetch-rtc-live-session-chunk";
import { RtcSocketContext, useRtcSocketContext } from "@/features/rtc/providers/rtc-socket-context";
import type { RtcLiveSessionProviderProps } from "@/features/rtc/providers/rtc-live-session-provider";

export type { RtcSocketContextValue } from "@/features/rtc/types/rtc-socket-context.types";
export { useRtcSocketContext };

const RtcLiveSessionProvider = lazy(loadRtcLiveSessionProviderLazy);

type RtcLiveSessionSuspenseFallbackProps = {
  activeRoomId: string;
  children: React.ReactNode;
};

function RtcLiveSessionSuspenseFallback({
  activeRoomId,
  children,
}: RtcLiveSessionSuspenseFallbackProps) {
  const setMediaStatus = useRoomStore((s) => s.setMediaStatus);
  const value = useMemo(
    () => createConnectingRtcSocketContextValue(activeRoomId),
    [activeRoomId],
  );

  useEffect(() => {
    setMediaStatus("connecting");
  }, [setMediaStatus]);

  return <RtcSocketContext.Provider value={value}>{children}</RtcSocketContext.Provider>;
}

/**
 * Owns rtc-service Socket.IO + mediasoup session for the active call.
 * Mediasoup-client loads in a separate chunk only when a call session starts.
 */
export function RtcSocketProvider({ children }: { children: React.ReactNode }) {
  const activeRoomId = useRoomStore(selectActiveRoomId);
  const sessionActive = useRoomStore(selectIsVideoSessionActive);
  const rtcPrimaryRemoteUserId = useRoomStore(selectRtcPrimaryRemoteUserId);
  const setMediaStatus = useRoomStore((s) => s.setMediaStatus);
  const { data: session, isPending: sessionPending } = useSession();
  const { data: myProfileData } = useMyProfile({ enabled: !sessionPending });
  const sessionUser = session?.user as
    | { id?: string | null; displayName?: string | null; name?: string | null; image?: string | null }
    | undefined;
  const profileDisplayName = myProfileData?.displayName ?? null;

  const rtcSessionLive =
    sessionActive && Boolean(activeRoomId) && !sessionPending && Boolean(sessionUser?.id);

  useEffect(() => {
    if (!rtcSessionLive) {
      setMediaStatus("idle");
    }
  }, [rtcSessionLive, setMediaStatus]);

  useRoomTabLeaseRtcSync({
    activeRoomId,
    sessionUserId: sessionUser?.id,
    sessionActive,
  });

  const idleValue = useMemo(
    () => createIdleRtcSocketContextValue(activeRoomId),
    [activeRoomId],
  );

  if (!rtcSessionLive || !activeRoomId || !sessionUser?.id) {
    return <RtcSocketContext.Provider value={idleValue}>{children}</RtcSocketContext.Provider>;
  }

  const liveProps: RtcLiveSessionProviderProps = {
    activeRoomId,
    sessionActive,
    rtcPrimaryRemoteUserId,
    sessionUser,
    profileDisplayName,
    children,
  };

  return (
    <Suspense
      fallback={
        <RtcLiveSessionSuspenseFallback activeRoomId={activeRoomId}>
          {children}
        </RtcLiveSessionSuspenseFallback>
      }
    >
      <RtcLiveSessionProvider {...liveProps} />
    </Suspense>
  );
}
