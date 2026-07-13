"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useGetRoom } from "@/features/room/api/room.queries";
import {
  ROOM_SESSION_WARNING_COPY,
  ROOM_SESSION_WARNING_MINUTES,
} from "@/features/room/constants/session/room-session-warnings";
import { resolveRoomExpiresAtIso } from "@/features/room/lib/session/resolve-room-expires-at";

const REFRESH_BEFORE_FIRST_WARNING_MS = 16 * 60_000;

/**
 * Toasts at 15m and 5m before server `expires_at` (per-session cap or scheduled calendar end).
 * Avoids 60s polling during calls — schedules timeouts and one refresh before the warning window.
 */
export function useRoomSessionExpiryWarnings(roomId: string, enabled: boolean): void {
  const { data: room, refetch } = useGetRoom(roomId, {
    enabled: enabled && Boolean(roomId),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const expiresAtIso = resolveRoomExpiresAtIso(room);
  const scheduleKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !expiresAtIso) return;

    const expiresAtMs = Date.parse(expiresAtIso);
    if (Number.isNaN(expiresAtMs)) return;

    const scheduleKey = `${roomId}:${expiresAtIso}`;
    if (scheduleKeyRef.current === scheduleKey) return;
    scheduleKeyRef.current = scheduleKey;

    const timers: ReturnType<typeof setTimeout>[] = [];

    for (const minutes of ROOM_SESSION_WARNING_MINUTES) {
      const warnAtMs = expiresAtMs - minutes * 60_000;
      const delay = warnAtMs - Date.now();

      const fire = () => {
        const msLeft = expiresAtMs - Date.now();
        if (msLeft <= 0 || msLeft > minutes * 60_000) return;
        toast.warning(ROOM_SESSION_WARNING_COPY[minutes], {
          id: `room-session-expiry-${minutes}-${roomId}`,
        });
      };

      if (delay > 0) {
        timers.push(setTimeout(fire, delay));
      } else if (Date.now() < expiresAtMs) {
        fire();
      }
    }

    const msUntilRefresh = expiresAtMs - REFRESH_BEFORE_FIRST_WARNING_MS - Date.now();
    if (msUntilRefresh > 0) {
      timers.push(
        setTimeout(() => {
          void refetch();
        }, msUntilRefresh),
      );
    }

    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [enabled, expiresAtIso, roomId, refetch]);
}
