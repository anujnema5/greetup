"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useGetRoomQuery } from "@/features/room/api/room-api";
import {
  ROOM_SESSION_EXPIRY_POLL_MS,
  ROOM_SESSION_WARNING_COPY,
  ROOM_SESSION_WARNING_MINUTES,
} from "@/features/room/constants/session/room-session-warnings";
import { resolveRoomExpiresAtIso } from "@/features/room/lib/session/resolve-room-expires-at";

/**
 * Toasts at 15m and 5m before server `expires_at` (per-session cap or scheduled calendar end).
 */
export function useRoomSessionExpiryWarnings(roomId: string, enabled: boolean): void {
  const { data: room } = useGetRoomQuery(roomId, {
    skip: !enabled || !roomId,
    pollingInterval: enabled ? ROOM_SESSION_EXPIRY_POLL_MS : 0,
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

    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [enabled, expiresAtIso, roomId]);
}
