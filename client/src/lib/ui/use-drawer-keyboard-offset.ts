"use client";

import { useEffect, type RefObject } from "react";

const TOP_CLEARANCE_PX = 12;

/**
 * Lifts a bottom drawer above the virtual keyboard using visualViewport.
 * Scoped to drawer content only — see shadcn-ui/ui#issues/2849.
 *
 * Retries after focus / delayed viewport updates: the first keyboard open often
 * fires mid-animation, so a single resize listener miss leaves the field covered
 * until the user focuses again.
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

    const apply = () => {
      const node = ref.current;
      if (!node) return;
      const keyboardOffset = Math.max(
        0,
        Math.round(window.innerHeight - vv.height - vv.offsetTop),
      );
      node.style.height = `${Math.max(120, Math.round(vv.height - TOP_CLEARANCE_PX))}px`;
      node.style.bottom = `${keyboardOffset}px`;

      // After the sheet lifts, keep the focused field above the footer / keyboard.
      const active = document.activeElement;
      if (
        active instanceof HTMLElement &&
        node.contains(active) &&
        active.matches("input, textarea, select, [contenteditable='true']")
      ) {
        active.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    };

    const reset = () => {
      const node = ref.current;
      if (!node) return;
      node.style.removeProperty("height");
      node.style.removeProperty("bottom");
    };

    let timers: number[] = [];

    const schedule = () => {
      apply();
      requestAnimationFrame(() => {
        apply();
        requestAnimationFrame(apply);
      });
      timers.forEach((id) => window.clearTimeout(id));
      timers = [
        window.setTimeout(apply, 100),
        window.setTimeout(apply, 280),
        window.setTimeout(apply, 480),
      ];
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!el.contains(target)) return;
      if (!target.matches("input, textarea, select, [contenteditable='true']")) {
        return;
      }
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
      timers.forEach((id) => window.clearTimeout(id));
      reset();
    };
  }, [enabled, ref]);
}
