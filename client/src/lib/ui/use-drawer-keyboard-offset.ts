"use client";

import { useEffect, type RefObject } from "react";

const TOP_CLEARANCE_PX = 12;

/**
 * Lifts a bottom drawer above the virtual keyboard using visualViewport.
 * Scoped to drawer content only — see shadcn-ui/ui#2849 (NeDurov / Vaul workarounds).
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
      const keyboardOffset = Math.max(
        0,
        Math.round(window.innerHeight - vv.height - vv.offsetTop),
      );
      el.style.height = `${Math.max(120, Math.round(vv.height - TOP_CLEARANCE_PX))}px`;
      el.style.bottom = `${keyboardOffset}px`;
    };

    const reset = () => {
      el.style.removeProperty("height");
      el.style.removeProperty("bottom");
    };

    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    apply();

    return () => {
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
      reset();
    };
  }, [enabled, ref]);
}
