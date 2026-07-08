"use client";

import { useSyncExternalStore } from "react";

import { getDialogKeyboardBottomInsetPx } from "@/components/ui/use-dialog-visual-viewport-style";

/**
 * Reactive on-screen-keyboard bottom inset in px (0 when the keyboard is closed).
 * One shared `visualViewport` subscription, independent of the dialog viewport store
 * (which gates on dialog-sized geometry and shouldn't be a dependency for page chrome
 * like `BottomNav` or the app shell height).
 */

let cached = 0;
const listeners = new Set<() => void>();
let attached = false;

function recompute() {
  const next = getDialogKeyboardBottomInsetPx();
  if (next === cached) return;
  cached = next;
  listeners.forEach((notify) => notify());
}

function attachListeners() {
  if (attached || typeof window === "undefined") return;
  const vv = window.visualViewport;
  if (!vv) return;
  attached = true;
  vv.addEventListener("resize", recompute);
  vv.addEventListener("scroll", recompute);
  vv.addEventListener("geometrychange", recompute);
  window.addEventListener("resize", recompute);
}

function detachListeners() {
  if (!attached) return;
  const vv = window.visualViewport;
  vv?.removeEventListener("resize", recompute);
  vv?.removeEventListener("scroll", recompute);
  vv?.removeEventListener("geometrychange", recompute);
  window.removeEventListener("resize", recompute);
  attached = false;
  cached = 0;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  if (listeners.size === 1) {
    recompute();
    attachListeners();
  }
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0) detachListeners();
  };
}

function getSnapshot(): number {
  return cached;
}

export function useKeyboardInsetPx(): number {
  return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}
