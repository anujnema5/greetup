import type { Metadata } from "next";
import { Suspense } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
// @ts-ignore: side-effect CSS import without module declarations
import "./globals.css";
import { SocketProvider } from "@/lib/socket";
import { ReduxProvider } from "@/lib/redux/provider";
import { RtcSocketProvider } from "@/features/rtc";
import { ChessSocketBridge } from "@/features/activity";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import {
  RoomMinimizedHydration,
  MinimizedRoomDock,
  DirectCallPartnerDisconnectHandler,
  RoomDirectExpandSocketBridge,
} from "@/features/room";
import { MatchmakingProvider } from "@/features/matching";
import { NotificationsRealtimeBridge } from "@/features/notifications";
import { ChatInboxSocketBridge } from "@/features/chat/components/chat-inbox-socket-bridge";
import { ChatMessagesCacheBridge } from "@/features/chat/components/chat-messages-cache-bridge";
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Greetup",
  description: "Find people who get you.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${plusJakartaSans.variable} antialiased font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <ReduxProvider>
            <RoomMinimizedHydration />
            <RtcSocketProvider>
              <SocketProvider>
                <RoomDirectExpandSocketBridge />
                <ChessSocketBridge />
                <NotificationsRealtimeBridge />
                <ChatInboxSocketBridge />
                <ChatMessagesCacheBridge />
                <Suspense fallback={null}>
                  <MatchmakingProvider>
                    <DirectCallPartnerDisconnectHandler />
                    <MinimizedRoomDock />
                    {children}
                  </MatchmakingProvider>
                </Suspense>
              </SocketProvider>
            </RtcSocketProvider>
          </ReduxProvider>
        </ThemeProvider>
        <Toaster position="bottom-right" closeButton />
      </body>
    </html>
  );
}