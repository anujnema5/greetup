"use client";

import { useCallback, useSyncExternalStore, type CSSProperties } from "react";

const EMPTY_STYLE: CSSProperties = {};

function computeKeyboardBottomInsetPx(): number {
  if (typeof window === "undefined" || !window.visualViewport) return 0;
  const vv = window.visualViewport;
  return Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
}

/** True when layout / keyboard differs from “full window” — then CSS % centering is wrong for `fixed` dialogs. */
function visualViewportNeedsPixelCentering(): boolean {
  if (typeof window === "undefined" || !window.visualViewport) return false;
  const vv = window.visualViewport;
  if (computeKeyboardBottomInsetPx() > 2) return true;
  if (window.innerHeight - vv.height > 4) return true;
  if (window.innerWidth - vv.width > 4) return true;
  if (vv.offsetTop > 2) return true;
  if (vv.offsetLeft > 2) return true;
  return false;
}

function stylesEqual(a: CSSProperties, b: CSSProperties): boolean {
  if (a === b) return true;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if ((a as Record<string, unknown>)[k] !== (b as Record<string, unknown>)[k]) {
      return false;
    }
  }
  return true;
}

function computeCenterStyle(): CSSProperties {
  if (typeof window === "undefined" || !window.visualViewport) return EMPTY_STYLE;
  if (!visualViewportNeedsPixelCentering()) return EMPTY_STYLE;
  const vv = window.visualViewport;
  return {
    top: Math.round(vv.offsetTop + vv.height / 2),
    left: Math.round(vv.offsetLeft + vv.width / 2),
    maxHeight: Math.max(120, Math.round(vv.height - 24)),
    transform: "translate(-50%, -50%)",
  };
}

function computeBottomStyle(): CSSProperties {
  if (typeof window === "undefined" || !window.visualViewport) return EMPTY_STYLE;
  const b = computeKeyboardBottomInsetPx();
  return b === 0 ? EMPTY_STYLE : { bottom: b };
}

// ─── External store: update only from viewport events (never during getSnapshot). ───

let centerStyle: CSSProperties = EMPTY_STYLE;
let bottomStyle: CSSProperties = EMPTY_STYLE;
const listeners = new Set<() => void>();
let attached = false;

function emitIfChanged() {
  const nextCenter = computeCenterStyle();
  const nextBottom = computeBottomStyle();
  if (stylesEqual(centerStyle, nextCenter) && stylesEqual(bottomStyle, nextBottom)) {
    return;
  }
  centerStyle = nextCenter;
  bottomStyle = nextBottom;
  listeners.forEach((l) => l());
}

function attachViewportListeners() {
  if (attached || typeof window === "undefined") return;
  const vv = window.visualViewport;
  if (!vv) return;
  attached = true;
  vv.addEventListener("resize", emitIfChanged);
  vv.addEventListener("scroll", emitIfChanged);
  window.addEventListener("resize", emitIfChanged);
}

function detachViewportListeners() {
  if (!attached) return;
  const vv = window.visualViewport;
  vv?.removeEventListener("resize", emitIfChanged);
  vv?.removeEventListener("scroll", emitIfChanged);
  window.removeEventListener("resize", emitIfChanged);
  attached = false;
  centerStyle = EMPTY_STYLE;
  bottomStyle = EMPTY_STYLE;
}

function subscribeViewport(onChange: () => void): () => void {
  listeners.add(onChange);
  if (listeners.size === 1) {
    emitIfChanged();
    attachViewportListeners();
  }
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0) {
      detachViewportListeners();
    }
  };
}

/**
 * Keeps `DialogContent` inside the visual viewport when the on-screen keyboard (or browser UI)
 * changes `visualViewport`. Bottom-anchored sheets get `bottom` inset; centered dialogs only
 * switch to pixel `top`/`left` when the visual viewport actually differs (otherwise Tailwind
 * `top-[50%] left-[50%]` stays correct).
 */
export function useDialogVisualViewportStyle(
  enabled: boolean,
  anchor: "center" | "bottom",
): CSSProperties {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!enabled) return () => {};
      return subscribeViewport(onStoreChange);
    },
    [enabled],
  );

  const getSnapshot = useCallback(() => {
    if (!enabled || typeof window === "undefined") {
      return EMPTY_STYLE;
    }
    return anchor === "bottom" ? bottomStyle : centerStyle;
  }, [enabled, anchor]);

  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_STYLE);
}

/** Heuristic: callers that anchor the sheet with Tailwind `bottom-0` (often with `!`). */
export function dialogContentIsBottomAnchored(className: string | undefined): boolean {
  if (!className) return false;
  return className.includes("bottom-0");
}
