"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { RTC_SOCKET_URL } from "@/shared/constants/environments";

export type RtcSocketState =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export type UseRtcSocketReturn = {
  rtcSocket: Socket | null;
  rtcSocketState: RtcSocketState;
};

/**
 * Connects to the rtc-service Socket.IO server using the provided JWT token.
 * The socket is created once the token is available and torn down on cleanup
 * (component unmount or token change).
 */
export function useRtcSocket(token: string | null): UseRtcSocketReturn {
  const [rtcSocket, setRtcSocket] = useState<Socket | null>(null);
  const [rtcSocketState, setRtcSocketState] = useState<RtcSocketState>("idle");

  useEffect(() => {
    if (!token) {
      setRtcSocketState("idle");
      setRtcSocket(null);
      return;
    }

    setRtcSocketState("connecting");

    const socket = io(RTC_SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    setRtcSocket(socket);

    socket.on("connect", () => {
      console.log("[RTC] Connected to rtc-service:", socket.id);
      setRtcSocketState("connected");
    });

    socket.on("disconnect", (reason) => {
      console.log("[RTC] Disconnected:", reason);
      setRtcSocketState("disconnected");
    });

    socket.on("connect_error", (err) => {
      console.error("[RTC] Connection error:", err.message);
      setRtcSocketState("error");
    });

    return () => {
      console.log("[RTC] Cleaning up rtc-service socket");
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.disconnect();
      setRtcSocket(null);
      setRtcSocketState("idle");
    };
  }, [token]);

  return { rtcSocket, rtcSocketState };
}
