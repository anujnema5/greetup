"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  PEER_PROFILE_HOVER_CLOSE_DELAY_MS,
  PEER_PROFILE_HOVER_OPEN_DELAY_MS,
} from "@/features/room/constants/call/peer-profile-hover";

export type PeerProfileHoverCoords = {
  left: number;
  top: number;
};

/** Fixed-position anchor coords + delayed open/close for the portal hover card. */
export function usePeerProfileHoverAnchor() {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<PeerProfileHoverCoords | null>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearOpenTimer = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      clearOpenTimer();
      clearCloseTimer();
    },
    [clearCloseTimer, clearOpenTimer],
  );

  const syncCoords = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({ left: rect.left, top: rect.top });
  }, []);

  const show = useCallback(() => {
    clearCloseTimer();
    clearOpenTimer();
    openTimerRef.current = setTimeout(() => {
      syncCoords();
      setOpen(true);
    }, PEER_PROFILE_HOVER_OPEN_DELAY_MS);
  }, [clearCloseTimer, clearOpenTimer, syncCoords]);

  const hide = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      setCoords(null);
    }, PEER_PROFILE_HOVER_CLOSE_DELAY_MS);
  }, [clearCloseTimer, clearOpenTimer]);

  return { anchorRef, open, coords, show, hide, syncCoords };
}
