"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

export const ROOM_MOBILE_CHAT_SHEET_HEIGHT_KEY = "circlo-room-mobile-chat-sheet-height";

const MAX_CAP_PX = 880;
const MIN_VH_FRACTION = 0.34;
const MAX_VH_FRACTION = 0.92;
const DEFAULT_VH_FRACTION = 0.56;

const SSR_FALLBACK_HEIGHT = 520;

function viewportHeightPx(): number {
  if (typeof window === "undefined") return 640;
  return Math.round(window.visualViewport?.height ?? window.innerHeight);
}

function computeBounds(vh: number): { min: number; max: number } {
  const min = Math.max(260, Math.round(vh * MIN_VH_FRACTION));
  const maxUncapped = Math.round(vh * MAX_VH_FRACTION);
  const max = Math.min(MAX_CAP_PX, Math.max(min + 100, maxUncapped));
  return { min, max };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function readStoredHeightPx(): number | null {
  try {
    const raw = sessionStorage.getItem(ROOM_MOBILE_CHAT_SHEET_HEIGHT_KEY);
    if (raw == null) return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function persistHeightPx(h: number): void {
  try {
    sessionStorage.setItem(ROOM_MOBILE_CHAT_SHEET_HEIGHT_KEY, String(Math.round(h)));
  } catch {
    /* ignore */
  }
}

export type UseRoomMobileChatSheetHeightResult = {
  heightPx: number;
  minHeightPx: number;
  maxHeightPx: number;
  isDragging: boolean;
  dragHandleProps: {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
  };
};

/**
 * Bottom-anchored room panel (chat / people / activities) on narrow viewports: vertical
 * resize by dragging the handle. Height is clamped to the viewport and persisted per tab session.
 */
export function useRoomMobileChatSheetHeight(open: boolean): UseRoomMobileChatSheetHeightResult {
  const boundsRef = useRef(computeBounds(viewportHeightPx()));
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);
  const heightRef = useRef(SSR_FALLBACK_HEIGHT);

  const [heightPx, setHeightPx] = useState(SSR_FALLBACK_HEIGHT);
  const [bounds, setBounds] = useState(() => computeBounds(viewportHeightPx()));
  const [isDragging, setIsDragging] = useState(false);

  const applyHeight = useCallback((h: number) => {
    const { min, max } = boundsRef.current;
    const c = clamp(h, min, max);
    heightRef.current = c;
    setHeightPx(c);
    return c;
  }, []);

  useLayoutEffect(() => {
    if (!open) return;

    const syncBoundsOnly = () => {
      const vh = viewportHeightPx();
      const b = computeBounds(vh);
      boundsRef.current = b;
      setBounds(b);
    };

    const onResize = () => {
      syncBoundsOnly();
      applyHeight(heightRef.current);
    };

    syncBoundsOnly();
    const vh = viewportHeightPx();
    const stored = readStoredHeightPx();
    const fallback = Math.round(vh * DEFAULT_VH_FRACTION);
    applyHeight(stored ?? fallback);

    const vv = window.visualViewport;
    vv?.addEventListener("resize", onResize);
    window.addEventListener("resize", onResize);
    return () => {
      vv?.removeEventListener("resize", onResize);
      window.removeEventListener("resize", onResize);
    };
  }, [open, applyHeight]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, startH: heightRef.current };
    setIsDragging(true);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!dragRef.current) return;
      e.preventDefault();
      const { startY, startH } = dragRef.current;
      const next = startH + (startY - e.clientY);
      applyHeight(next);
    },
    [applyHeight],
  );

  const endDrag = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    persistHeightPx(heightRef.current);
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      endDrag(e);
    },
    [endDrag],
  );

  const onPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      endDrag(e);
    },
    [endDrag],
  );

  return {
    heightPx,
    minHeightPx: bounds.min,
    maxHeightPx: bounds.max,
    isDragging,
    dragHandleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
  };
}
