"use client";

import { useEffect } from "react";

import { useKeyboardInsetPx } from "@/lib/ui/use-keyboard-inset-px";

/**
 * Keeps `--kb-inset` on `<html>` in sync with the on-screen keyboard height, for
 * `position: fixed` chrome (`BottomNav`) and the `.app-shell-h` page height utility —
 * see `globals.css` for why this is needed with `interactive-widget=overlays-content`.
 */
export function KeyboardInsetCssVar() {
  const insetPx = useKeyboardInsetPx();

  useEffect(() => {
    document.documentElement.style.setProperty("--kb-inset", `${insetPx}px`);
  }, [insetPx]);

  return null;
}
