"use client";

/**
 * Visual viewport integration for `DialogContent` (mobile keyboard, iOS Safari, bottom sheets).
 *
 * - **Centered dialogs:** Usually rely on Tailwind `top-[50%] left-[50%]` + `translate-*`. When the
 *   visual viewport shrinks (keyboard, chrome), `%` is wrong for `position: fixed`; we then set pixel
 *   `top`/`left` and `translate: -50% -50%` (longhand so `zoom-in-*` scale on `transform` still works).
 * - **Bottom sheets:** Classnames often use `bottom-0!`, which beats normal inline `bottom`. The dialog
 *   applies keyboard inset with `setProperty(..., 'important')` instead.
 *
 * One shared `useSyncExternalStore` subscription avoids per-dialog listeners and keeps snapshots stable.
 */

import { useCallback, useSyncExternalStore, type CSSProperties } from "react";

const EMPTY_STYLE: CSSProperties = {};

/** Exported so callers can tune spacing above the keyboard in one place. */
export const DIALOG_VISUAL_VIEWPORT_KEYBOARD_GAP_PX = 12;

const CENTER_PAD_TOP_PX = 16;
const CENTER_PAD_BOTTOM_PX = 16;

/** Skip bogus geometry while the keyboard is animating (prevents a flash in the top-left). */
const MIN_VV_AXIS_PX = 48;

/** When pixel `top`/`left` is needed instead of `%` centering. */
const NUDGE = {
  minKeyboardInsetPx: 1,
  minHeightLossPx: 12,
  heightLossNeedsOffsetTopPx: 2,
  minOffsetTopOrLeftPx: 6,
} as const;

// ─── Geometry (read-only; safe to call from viewport event handlers) ─────────

function keyboardBottomInsetPx(): number {
  if (typeof window === "undefined" || !window.visualViewport) return 0;
  const vv = window.visualViewport;
  const raw = window.innerHeight - vv.offsetTop - vv.height;
  if (raw <= 0.5) return 0;
  return Math.max(1, Math.round(raw));
}

/** Public helper for scroll-into-view and other dialog keyboard utilities. */
export function getDialogKeyboardBottomInsetPx(): number {
  return keyboardBottomInsetPx();
}

function shouldUsePixelCentering(): boolean {
  if (typeof window === "undefined" || !window.visualViewport) return false;
  const vv = window.visualViewport;
  const inset = keyboardBottomInsetPx();
  if (inset >= NUDGE.minKeyboardInsetPx) return true;

  // Do not use `innerWidth - vv.width` here: a few px mismatch is common (scrollbars,
  // browser chrome) and incorrectly enables pixel centering. That drops Tailwind
  // translate classes and relies on the `translate` longhand — when that path misbehaves,
  // dialogs jump toward the top-left on desktop and mobile.

  const heightLoss = window.innerHeight - vv.height;
  if (heightLoss > NUDGE.minHeightLossPx && vv.offsetTop > NUDGE.heightLossNeedsOffsetTopPx) {
    return true;
  }

  if (vv.offsetTop > NUDGE.minOffsetTopOrLeftPx || vv.offsetLeft > NUDGE.minOffsetTopOrLeftPx) {
    return true;
  }

  return false;
}

function cssPropsEqual(a: CSSProperties, b: CSSProperties): boolean {
  if (a === b) return true;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if ((a as Record<string, unknown>)[k] !== (b as Record<string, unknown>)[k]) return false;
  }
  return true;
}

function centeredDialogStyle(): CSSProperties {
  if (typeof window === "undefined" || !window.visualViewport) return EMPTY_STYLE;
  if (!shouldUsePixelCentering()) return EMPTY_STYLE;

  const vv = window.visualViewport;
  if (vv.width < MIN_VV_AXIS_PX || vv.height < MIN_VV_AXIS_PX) return EMPTY_STYLE;

  const inset = keyboardBottomInsetPx();
  const keyboardGap = inset >= 1 ? DIALOG_VISUAL_VIEWPORT_KEYBOARD_GAP_PX : 0;
  const maxHeight = Math.max(
    120,
    Math.round(vv.height - CENTER_PAD_TOP_PX - CENTER_PAD_BOTTOM_PX - keyboardGap),
  );

  return {
    top: Math.round(vv.offsetTop + vv.height / 2),
    left: Math.round(vv.offsetLeft + vv.width / 2),
    maxHeight,
    translate: "-50% -50%",
  } as CSSProperties;
}

const BOTTOM_SHEET_TOP_CLEARANCE_PX = 16;

function bottomAnchoredInsetStyle(): CSSProperties {
  if (typeof window === "undefined" || !window.visualViewport) return EMPTY_STYLE;
  const vv = window.visualViewport;
  if (vv.width < MIN_VV_AXIS_PX || vv.height < MIN_VV_AXIS_PX) return EMPTY_STYLE;

  const inset = keyboardBottomInsetPx();
  const maxHeight = Math.max(
    120,
    Math.round(vv.height - BOTTOM_SHEET_TOP_CLEARANCE_PX),
  );

  if (inset === 0) {
    return { maxHeight };
  }

  return {
    bottom: inset + DIALOG_VISUAL_VIEWPORT_KEYBOARD_GAP_PX,
    maxHeight,
  };
}

// ─── Module-level store (updates only from viewport events, never in getSnapshot) ───

let snapshotCenter: CSSProperties = EMPTY_STYLE;
let snapshotBottom: CSSProperties = EMPTY_STYLE;
const storeListeners = new Set<() => void>();
let viewportListenersAttached = false;

function recalculateViewportStyles() {
  const nextCenter = centeredDialogStyle();
  const nextBottom = bottomAnchoredInsetStyle();
  if (cssPropsEqual(snapshotCenter, nextCenter) && cssPropsEqual(snapshotBottom, nextBottom)) {
    return;
  }
  snapshotCenter = nextCenter;
  snapshotBottom = nextBottom;
  storeListeners.forEach((notify) => notify());
}

function attachGlobalViewportListeners() {
  if (viewportListenersAttached || typeof window === "undefined") return;
  const vv = window.visualViewport;
  if (!vv) return;
  viewportListenersAttached = true;
  vv.addEventListener("resize", recalculateViewportStyles);
  vv.addEventListener("scroll", recalculateViewportStyles);
  vv.addEventListener("geometrychange", recalculateViewportStyles);
  window.addEventListener("resize", recalculateViewportStyles);
}

function detachGlobalViewportListeners() {
  if (!viewportListenersAttached) return;
  const vv = window.visualViewport;
  vv?.removeEventListener("resize", recalculateViewportStyles);
  vv?.removeEventListener("scroll", recalculateViewportStyles);
  vv?.removeEventListener("geometrychange", recalculateViewportStyles);
  window.removeEventListener("resize", recalculateViewportStyles);
  viewportListenersAttached = false;
  snapshotCenter = EMPTY_STYLE;
  snapshotBottom = EMPTY_STYLE;
}

function subscribeToViewportStore(onStoreChange: () => void): () => void {
  storeListeners.add(onStoreChange);
  if (storeListeners.size === 1) {
    recalculateViewportStyles();
    attachGlobalViewportListeners();
  }
  return () => {
    storeListeners.delete(onStoreChange);
    if (storeListeners.size === 0) detachGlobalViewportListeners();
  };
}

// ─── Responsive anchor (`dialog-form-sheet` = bottom sheet on phones only) ───

let maxSmMatches = false;
const maxSmMqListeners = new Set<() => void>();
let maxSmMqAttached = false;

function subscribeMaxSmMq(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  if (!maxSmMqAttached) {
    const mq = window.matchMedia("(max-width: 639px)");
    maxSmMatches = mq.matches;
    const handler = () => {
      maxSmMatches = mq.matches;
      maxSmMqListeners.forEach((notify) => notify());
    };
    mq.addEventListener("change", handler);
    maxSmMqAttached = true;
  }
  maxSmMqListeners.add(onChange);
  return () => {
    maxSmMqListeners.delete(onChange);
  };
}

function getMaxSmMatches(): boolean {
  return maxSmMatches;
}

export function useDialogContentAnchor(className: string | undefined): "center" | "bottom" {
  const isMaxSm = useSyncExternalStore(subscribeMaxSmMq, getMaxSmMatches, () => false);
  if (className?.includes("dialog-form-sheet")) {
    return isMaxSm ? "bottom" : "center";
  }
  return dialogContentIsBottomAnchored(className) ? "bottom" : "center";
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function useDialogVisualViewportStyle(
  enabled: boolean,
  anchor: "center" | "bottom",
): CSSProperties {
  const subscribe = useCallback(
    (onChange: () => void) => (enabled ? subscribeToViewportStore(onChange) : () => {}),
    [enabled],
  );

  const getSnapshot = useCallback(() => {
    if (!enabled || typeof window === "undefined") return EMPTY_STYLE;
    return anchor === "bottom" ? snapshotBottom : snapshotCenter;
  }, [enabled, anchor]);

  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_STYLE);
}

/** Bottom sheets pass `bottom-0` (often `!`); everything else is treated as centered. */
export function dialogContentIsBottomAnchored(className: string | undefined): boolean {
  return Boolean(className?.includes("bottom-0"));
}

/** Pixel centering is active → `DialogContent` must not add Tailwind `translate-x/y` (avoids double offset). */
export function dialogContentHasPixelCenterOffset(
  enabled: boolean,
  anchor: "center" | "bottom",
  style: CSSProperties,
): boolean {
  return enabled && anchor === "center" && typeof style.top === "number";
}

/** When set, `bottom` is applied with `!important` in `DialogContent` to beat `bottom-0!`. */
export function dialogContentKeyboardBottomPx(
  enabled: boolean,
  anchor: "center" | "bottom",
  style: CSSProperties,
): number | undefined {
  if (!enabled || anchor !== "bottom" || typeof style.bottom !== "number") return undefined;
  return style.bottom;
}

/** `bottom` is handled separately for bottom sheets; merge the rest into `style`. */
export function dialogViewportStyleForInlineMerge(style: CSSProperties): CSSProperties {
  const { bottom: _omit, ...rest } = style;
  return rest;
}
