"use client";

import { Suspense, type ReactNode } from "react";

import { ChessSocketBridge } from "@/features/activity";
import { ChatRealtimeBridges } from "@/features/chat/components/chat-realtime-bridges";
import { ConnectionCallBridge } from "@/features/connection-call";
import { ConnectionRealtimeBridge } from "@/features/connections";
import { MatchmakingProvider } from "@/features/matching";
import { NotificationsRealtimeBridge } from "@/features/notifications";
import {
  MinimizedRoomDock,
  OnDirectExpandedToCircle,
  RoomMinimizedHydration,
  RoomSocketBridge,
} from "@/features/room";
import { RtcSocketProvider } from "@/features/rtc";
import { TourGuideProvider } from "@/features/tour-guide";
import { SocketProvider } from "@/lib/socket";

/** Realtime, matchmaking, and in-call bridges — only mounted for authenticated routes. */
export function AuthenticatedProviders({ children }: { children: ReactNode }) {
  return (
    <>
      <RoomMinimizedHydration />
      <RtcSocketProvider>
        <SocketProvider>
          <OnDirectExpandedToCircle />
          <ChessSocketBridge />
          <ConnectionCallBridge />
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
    </>
  );
}
