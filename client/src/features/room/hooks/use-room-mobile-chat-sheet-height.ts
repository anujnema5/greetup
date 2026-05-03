"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

export const ROOM_MOBILE_CHAT_SHEET_HEIGHT_KEY = "circlo-room-mobile-chat-sheet-height";

const MAX_CAP_PX = 880;
const MIN_VH_FRACTION = 0.34;
const MAX_VH_FRACTION = 0.92;
const DEFAULT_VH_FRACTION = 0.56;

const SSR_FALLBACK_HEIGHT = 520;

/** Pixels before a surface touch becomes a sheet resize (lets taps / light moves pass through). */
const SURFACE_DRAG_THRESHOLD_PX = 14;
/** Vertical movement must dominate horizontal by this factor to resize (else treat as scroll). */
const SURFACE_DRAG_DOMINANCE = 1.35;

function viewportHeightPx(): number {
  if (typeof window === "undefined") return 640;
  return Math.round(window.visualViewport?.height ?? window.innerHeight);
}

function computeBounds(vh: number): { min: number; max: number } {
  const vhSafe = Math.max(0, vh);
  const maxUncapped = Math.round(vhSafe * MAX_VH_FRACTION);
  const max = Math.min(MAX_CAP_PX, Math.max(120, maxUncapped));
  const minCandidate = Math.max(120, Math.round(vhSafe * MIN_VH_FRACTION));
  const min = Math.min(minCandidate, max);
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

function isInteractiveTarget(t: EventTarget | null): boolean {
  if (!(t instanceof Element)) return false;
  return Boolean(
    t.closest(
      'input, textarea, select, button, a[href], [contenteditable="true"], [role="slider"], [role="textbox"]',
    ),
  );
}

/** Nearest ancestor that can scroll vertically (chat / tab lists). */
function findVerticalScrollParent(el: Element | null): HTMLElement | null {
  let cur: Element | null = el;
  while (cur) {
    if (cur instanceof HTMLElement) {
      const st = getComputedStyle(cur);
      const oy = st.overflowY;
      if ((oy === "auto" || oy === "scroll" || oy === "overlay") && cur.scrollHeight > cur.clientHeight + 1) {
        return cur;
      }
    }
    cur = cur.parentElement;
  }
  return null;
}

type ResizeSession = {
  pointerId: number;
  startY: number;
  startH: number;
};

type SurfacePending = {
  pointerId: number;
  startX: number;
  startY: number;
  startH: number;
  target: EventTarget | null;
};

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
  /** Attach to the panel body (tabs + chat). Drag up/down after a short vertical threshold resizes the sheet. */
  sheetContentDragProps: {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
  };
};

/**
 * Bottom-anchored room panel on narrow viewports: resize by dragging the handle, or by a vertical
 * drag anywhere on the panel body (unless the gesture should scroll messages / hits a control).
 */
export function useRoomMobileChatSheetHeight(open: boolean): UseRoomMobileChatSheetHeightResult {
  const boundsRef = useRef(computeBounds(viewportHeightPx()));
  const resizeSessionRef = useRef<ResizeSession | null>(null);
  const surfacePendingRef = useRef<SurfacePending | null>(null);
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

  const endResize = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget;
    surfacePendingRef.current = null;
    if (!resizeSessionRef.current || resizeSessionRef.current.pointerId !== e.pointerId) {
      return;
    }
    resizeSessionRef.current = null;
    setIsDragging(false);
    try {
      el.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    persistHeightPx(heightRef.current);
  }, []);

  const applyResizeFromEvent = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!resizeSessionRef.current || resizeSessionRef.current.pointerId !== e.pointerId) return;
      e.preventDefault();
      const { startY, startH } = resizeSessionRef.current;
      applyHeight(startH + (startY - e.clientY));
    },
    [applyHeight],
  );

  useLayoutEffect(() => {
    if (!open) {
      resizeSessionRef.current = null;
      surfacePendingRef.current = null;
      setIsDragging(false);
      return;
    }

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

  const onHandlePointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    surfacePendingRef.current = null;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    resizeSessionRef.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      startH: heightRef.current,
    };
    setIsDragging(true);
  }, []);

  const onSheetPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    if (isInteractiveTarget(e.target)) return;
    surfacePendingRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startH: heightRef.current,
      target: e.target,
    };
  }, []);

  const onSheetPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (resizeSessionRef.current?.pointerId === e.pointerId) {
        applyResizeFromEvent(e);
        return;
      }

      const p = surfacePendingRef.current;
      if (!p || p.pointerId !== e.pointerId) return;

      const dx = e.clientX - p.startX;
      const dy = e.clientY - p.startY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDy < SURFACE_DRAG_THRESHOLD_PX && absDx < SURFACE_DRAG_THRESHOLD_PX) return;

      if (absDx > absDy * SURFACE_DRAG_DOMINANCE && absDx > SURFACE_DRAG_THRESHOLD_PX) {
        surfacePendingRef.current = null;
        return;
      }

      if (absDy > absDx * SURFACE_DRAG_DOMINANCE && absDy > SURFACE_DRAG_THRESHOLD_PX) {
        const dragUp = dy < 0;
        if (dragUp && p.target instanceof Element) {
          const sp = findVerticalScrollParent(p.target);
          if (sp && sp.scrollTop > 8) {
            surfacePendingRef.current = null;
            return;
          }
        }

        e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        resizeSessionRef.current = {
          pointerId: e.pointerId,
          startY: p.startY,
          startH: p.startH,
        };
        surfacePendingRef.current = null;
        setIsDragging(true);
        applyHeight(p.startH + (p.startY - e.clientY));
      }
    },
    [applyHeight, applyResizeFromEvent],
  );

  const onSheetPointerUpOrCancel = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (resizeSessionRef.current?.pointerId === e.pointerId) {
        endResize(e);
        return;
      }
      if (surfacePendingRef.current?.pointerId === e.pointerId) {
        surfacePendingRef.current = null;
      }
    },
    [endResize],
  );

  return {
    heightPx,
    minHeightPx: bounds.min,
    maxHeightPx: bounds.max,
    isDragging,
    dragHandleProps: {
      onPointerDown: onHandlePointerDown,
      onPointerMove: applyResizeFromEvent,
      onPointerUp: endResize,
      onPointerCancel: endResize,
    },
    sheetContentDragProps: {
      onPointerDown: onSheetPointerDown,
      onPointerMove: onSheetPointerMove,
      onPointerUp: onSheetPointerUpOrCancel,
      onPointerCancel: onSheetPointerUpOrCancel,
    },
  };
}
