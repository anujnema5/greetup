"use client";

import { Suspense, type ReactNode } from "react";

import { ChessSocketBridge } from "@/features/activity";
import { AppSearchPaletteRoot } from "@/features/app-shell/components/app-search-palette-provider";
import { ChatRealtimeBridges } from "@/features/chat/components/chat-realtime-bridges";
import { ConnectionCallBridge } from "@/features/connection-call";
import { ConnectionRealtimeBridge } from "@/features/connections";
import { useGuestTryStatus } from "@/features/guest-try/hooks/use-guest-try-status";
import { MatchmakingProvider } from "@/features/matching";
import { NotificationsRealtimeBridge } from "@/features/notifications";
import {
  OpenToConnectInboundBridge,
  OpenToConnectRealtimeBridge,
} from "@/features/open-to-connect";
import {
  MinimizedRoomDock,
  OnDirectExpandedToSpace,
  RoomMinimizedHydration,
  RoomSocketBridge,
} from "@/features/room";
import { RtcSocketProvider } from "@/features/rtc";
import { TourGuideProvider } from "@/features/tour-guide";
import { useSession } from "@/lib/auth-client";
import { QueryProvider } from "@/lib/query/provider";
import { SocketProvider } from "@/lib/socket";

/**
 * Member-only HTTP/socket bridges. Guests on `/try` (and guest trial calls) share
 * the realtime layout for matching/RTC, but must not hit full-app APIs.
 */
function MemberOnlyRealtimeBridges() {
  const { data: session, isPending: sessionPending } = useSession();
  const isLoggedIn = Boolean(session?.user);
  const { data: guestStatus } = useGuestTryStatus({
    enabled: !sessionPending && isLoggedIn,
  });
  const isMember = guestStatus?.isGuest === false;

  if (!isMember) return null;

  return (
    <>
      <ChessSocketBridge />
      <ConnectionCallBridge />
      <OpenToConnectInboundBridge />
      <OpenToConnectRealtimeBridge />
      <NotificationsRealtimeBridge />
      <ConnectionRealtimeBridge />
      <ChatRealtimeBridges />
    </>
  );
}

function RealtimeAppShell({ children }: { children: ReactNode }) {
  const { data: session, isPending: sessionPending } = useSession();
  const isLoggedIn = Boolean(session?.user);
  const { data: guestStatus } = useGuestTryStatus({
    enabled: !sessionPending && isLoggedIn,
  });
  const isMember = guestStatus?.isGuest === false;

  const core = (
    <>
      <RoomSocketBridge />
      <MinimizedRoomDock />
      {children}
    </>
  );

  // Always provide TourGuide — guest-status can lag after login/logout, and
  // /home mounts WelcomeTourLauncher before isMember flips true.
  return (
    <TourGuideProvider>
      {isMember ? <AppSearchPaletteRoot>{core}</AppSearchPaletteRoot> : core}
    </TourGuideProvider>
  );
}

export function RealtimeProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <RoomMinimizedHydration />
      <RtcSocketProvider>
        <SocketProvider>
          <OnDirectExpandedToSpace />
          <MemberOnlyRealtimeBridges />
          <Suspense fallback={null}>
            <MatchmakingProvider>
              <RealtimeAppShell>{children}</RealtimeAppShell>
            </MatchmakingProvider>
          </Suspense>
        </SocketProvider>
      </RtcSocketProvider>
    </QueryProvider>
  );
}
