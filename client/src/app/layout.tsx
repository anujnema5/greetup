import type { Metadata } from "next";
import { Suspense } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
// @ts-ignore: side-effect CSS import without module declarations
import "./globals.css";
import { SocketProvider } from "@/lib/socket";
import { QueryProvider } from "@/lib/query/provider";
import { RtcSocketProvider } from "@/features/rtc";
import { ChessSocketBridge } from "@/features/activity";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

import {
  RoomMinimizedHydration,
  MinimizedRoomDock,
  RoomSocketBridge,
  OnDirectExpandedToCircle,
} from "@/features/room";

import { MatchmakingProvider } from "@/features/matching";
import { ConnectionRealtimeBridge } from "@/features/connections";
import { NotificationsRealtimeBridge } from "@/features/notifications";
import { ChatRealtimeBridges } from "@/features/chat/components/chat-realtime-bridges";
import { ConnectionCallBridge } from "@/features/connection-call";

import { TourGuideProvider } from "@/features/tour-guide";
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});


import { SiteJsonLd } from "@/components/seo/site-json-ld";
import { SiteGoogleAnalytics } from "@/components/analytics/google-analytics";
import { rootMetadata } from "@/lib/site";

export const metadata: Metadata = rootMetadata;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${plusJakartaSans.variable} antialiased font-sans`}>
        <SiteJsonLd />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
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
          </QueryProvider>
        </ThemeProvider>
        <Toaster position="bottom-right" closeButton />
      </body>
      <SiteGoogleAnalytics />
    </html>
  );
}
