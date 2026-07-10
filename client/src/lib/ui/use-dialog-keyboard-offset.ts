"use client";

import { useEffect, type RefObject } from "react";

const PAD_PX = 12;
const FOCUSABLE =
  "input, textarea, select, [contenteditable='true']";
const RETRY_MS = [120, 350] as const;

/**
 * Keeps a centered `DialogContent` inside the visual viewport when the keyboard opens.
 * Look stays the same (centered card); only position/max-height adapt.
 */
export function useDialogKeyboardOffset(
  ref: RefObject<HTMLElement | null>,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    const vv = window.visualViewport;
    if (!el || !vv) return;

    let timers: number[] = [];

    const clear = () => {
      const node = ref.current;
      if (!node) return;
      node.style.removeProperty("top");
      node.style.removeProperty("left");
      node.style.removeProperty("max-height");
      node.style.removeProperty("translate");
    };

    const apply = () => {
      const node = ref.current;
      if (!node) return;

      const inset = Math.max(
        0,
        Math.round(window.innerHeight - vv.height - vv.offsetTop),
      );

      if (inset < 1) {
        clear();
        return;
      }

      node.style.top = `${Math.round(vv.offsetTop + vv.height / 2)}px`;
      node.style.left = `${Math.round(vv.offsetLeft + vv.width / 2)}px`;
      node.style.maxHeight = `${Math.max(120, Math.round(vv.height - PAD_PX * 2))}px`;
      node.style.translate = "-50% -50%";

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
      clear();
    };
  }, [enabled, ref]);
}
