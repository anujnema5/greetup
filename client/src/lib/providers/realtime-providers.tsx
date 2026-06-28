"use client";

import { Suspense } from "react";
import { SocketProvider } from "@/lib/socket";
import { QueryProvider } from "@/lib/query/provider";
import { RtcSocketProvider } from "@/features/rtc";
import { ChessSocketBridge } from "@/features/activity";
import {
  RoomMinimizedHydration,
  MinimizedRoomDock,
  RoomSocketBridge,
  OnDirectExpandedToSpace,
} from "@/features/room";
import { MatchmakingProvider } from "@/features/matching";
import { ConnectionRealtimeBridge } from "@/features/connections";
import { NotificationsRealtimeBridge } from "@/features/notifications";
import { ChatRealtimeBridges } from "@/features/chat/components/chat-realtime-bridges";
import { ConnectionCallBridge } from "@/features/connection-call";
import { OpenToConnectRealtimeBridge } from "@/features/open-to-connect";
import { TourGuideProvider } from "@/features/tour-guide";

export function RealtimeProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <RoomMinimizedHydration />
      <RtcSocketProvider>
        <SocketProvider>
          <OnDirectExpandedToSpace />
          <ChessSocketBridge />
          <ConnectionCallBridge />
          <OpenToConnectRealtimeBridge />
          <NotificationsRealtimeBridge />
          <ConnectionRealtimeBridge />
          <ChatRealtimeBridges />
          <Suspense fallback={null}>
            <MatchmakingProvider>
              <TourGuideProvider>
                <RoomSocketBridge />
                <MinimizedRoomDock />
                {children}
              </TourGuideProvider>
            </MatchmakingProvider>
          </Suspense>
        </SocketProvider>
      </RtcSocketProvider>
    </QueryProvider>
  );
}
