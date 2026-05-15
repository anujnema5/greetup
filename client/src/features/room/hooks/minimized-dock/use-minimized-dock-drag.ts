"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type RefObject,
} from "react";

export const MINIMIZED_DOCK_OFFSET_STORAGE_KEY = "greetup-minimized-dock-drag";

function clampDragToViewport(
  el: HTMLElement,
  drag: { x: number; y: number },
): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  const m = 8;
  let { x, y } = drag;
  if (r.left < m) x += m - r.left;
  if (r.top < m) y += m - r.top;
  if (r.right > window.innerWidth - m) x -= r.right - (window.innerWidth - m);
  if (r.bottom > window.innerHeight - m) y -= r.bottom - (window.innerHeight - m);
  return { x, y };
}

/**
 * Persists drag offset in `sessionStorage` and reapplies transform after React re-renders
 * (`layoutTick` is typically call elapsed seconds).
 */
export function useMinimizedDockDrag(
  cardRef: RefObject<HTMLDivElement | null>,
  visible: boolean,
  layoutTick: number,
) {
  const posRef = useRef({ x: 0, y: 0 });
  const dragSession = useRef<{ lastX: number; lastY: number } | null>(null);

  const applyTransform = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    const { x, y } = posRef.current;
    el.style.transform = `translate(${x}px, ${y}px)`;
  }, [cardRef]);

  const clampAndApply = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    const { x, y } = posRef.current;
    el.style.transform = `translate(${x}px, ${y}px)`;
    const c = clampDragToViewport(el, { x, y });
    posRef.current = c;
    el.style.transform = `translate(${c.x}px, ${c.y}px)`;
  }, [cardRef]);

  useLayoutEffect(() => {
    if (!visible) return;
    const el = cardRef.current;
    if (!el) return;
    try {
      const raw = sessionStorage.getItem(MINIMIZED_DOCK_OFFSET_STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as { x?: number; y?: number };
        if (typeof p.x === "number" && typeof p.y === "number") {
          posRef.current = { x: p.x, y: p.y };
        } else {
          posRef.current = { x: 0, y: 0 };
        }
      } else {
        posRef.current = { x: 0, y: 0 };
      }
    } catch {
      posRef.current = { x: 0, y: 0 };
    }
    applyTransform();
    clampAndApply();
  }, [visible, applyTransform, clampAndApply, cardRef]);

  useLayoutEffect(() => {
    if (!visible) return;
    applyTransform();
  }, [visible, applyTransform, layoutTick, cardRef]);

  useEffect(() => {
    if (!visible) return;
    const onResize = () => {
      clampAndApply();
      try {
        sessionStorage.setItem(MINIMIZED_DOCK_OFFSET_STORAGE_KEY, JSON.stringify(posRef.current));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [visible, clampAndApply]);

  const onDragPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragSession.current = { lastX: e.clientX, lastY: e.clientY };
  }, []);

  const onDragPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragSession.current) return;
      const dx = e.clientX - dragSession.current.lastX;
      const dy = e.clientY - dragSession.current.lastY;
      dragSession.current.lastX = e.clientX;
      dragSession.current.lastY = e.clientY;
      posRef.current.x += dx;
      posRef.current.y += dy;
      applyTransform();
      clampAndApply();
    },
    [applyTransform, clampAndApply],
  );

  const onDragPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragSession.current) return;
      dragSession.current = null;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      clampAndApply();
      try {
        sessionStorage.setItem(MINIMIZED_DOCK_OFFSET_STORAGE_KEY, JSON.stringify(posRef.current));
      } catch {
        /* ignore */
      }
    },
    [clampAndApply],
  );

  return {
    onDragPointerDown,
    onDragPointerMove,
    onDragPointerUp,
  };
}
