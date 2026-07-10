"use client";

import { useEffect, type RefObject } from "react";

const TOP_CLEARANCE_PX = 12;
const FOCUSABLE =
  "input, textarea, select, [contenteditable='true']";
/** Keyboard open animation is slow — one resize event is not enough. */
const RETRY_MS = [120, 350] as const;

/**
 * Lifts a bottom drawer above the virtual keyboard (`visualViewport`).
 * Drawer-scoped only — see https://github.com/shadcn-ui/ui/issues/2849
 */
export function useDrawerKeyboardOffset(
  ref: RefObject<HTMLElement | null>,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    const vv = window.visualViewport;
    if (!el || !vv) return;

    let timers: number[] = [];

    const apply = () => {
      const node = ref.current;
      if (!node) return;

      const inset = Math.max(
        0,
        Math.round(window.innerHeight - vv.height - vv.offsetTop),
      );
      node.style.height = `${Math.max(120, Math.round(vv.height - TOP_CLEARANCE_PX))}px`;
      node.style.bottom = `${inset}px`;

      const active = document.activeElement;
      if (
        active instanceof HTMLElement &&
        node.contains(active) &&
        active.matches(FOCUSABLE)
      ) {
        active.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    };

    const schedule = () => {
      apply();
      requestAnimationFrame(apply);
      timers.forEach(clearTimeout);
      timers = RETRY_MS.map((ms) => window.setTimeout(apply, ms));
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!el.contains(target) || !target.matches(FOCUSABLE)) return;
      schedule();
    };

    vv.addEventListener("resize", schedule);
    vv.addEventListener("scroll", schedule);
    el.addEventListener("focusin", onFocusIn);
    schedule();

    return () => {
      vv.removeEventListener("resize", schedule);
      vv.removeEventListener("scroll", schedule);
      el.removeEventListener("focusin", onFocusIn);
      timers.forEach(clearTimeout);
      el.style.removeProperty("height");
      el.style.removeProperty("bottom");
    };
  }, [enabled, ref]);
}
