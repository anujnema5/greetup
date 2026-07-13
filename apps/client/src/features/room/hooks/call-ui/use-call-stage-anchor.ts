"use client";

import { useEffect, type RefObject } from "react";

/**
 * Publishes the stage's bottom-right inset — the distance from the viewport's
 * right/bottom edges to the stage element's right/bottom edges — as CSS custom
 * properties on `<html>`:
 *
 *   --call-stage-right   distance from viewport right edge → stage right edge
 *   --call-stage-bottom  distance from viewport bottom edge → stage bottom edge
 *
 * The in-call conversation-cue toast (portaled to `<body>`, outside the call tree)
 * anchors to these so it lands in the stage's bottom-right corner regardless of
 * whether the chat sidebar is shown or how wide the window is — no hard-coded
 * sidebar width. The vars are cleared on unmount so stray toasts elsewhere fall
 * back to their default position.
 */
export function useCallStageAnchor(stageRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof window === "undefined") return;

    const root = document.documentElement;
    const update = () => {
      const rect = el.getBoundingClientRect();
      root.style.setProperty(
        "--call-stage-right",
        `${Math.max(0, Math.round(window.innerWidth - rect.right))}px`,
      );
      root.style.setProperty(
        "--call-stage-bottom",
        `${Math.max(0, Math.round(window.innerHeight - rect.bottom))}px`,
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      root.style.removeProperty("--call-stage-right");
      root.style.removeProperty("--call-stage-bottom");
    };
  }, [stageRef]);
}
