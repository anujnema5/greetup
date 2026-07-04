"use client";

import { useEffect, type RefObject } from "react";

import {
  DIALOG_VISUAL_VIEWPORT_KEYBOARD_GAP_PX,
  getDialogKeyboardBottomInsetPx,
} from "@/components/ui/use-dialog-visual-viewport-style";

const FOCUSABLE_FIELD_SELECTOR =
  'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), [contenteditable="true"]';

/** Scroll a focused field into the visible dialog body, above the on-screen keyboard. */
export function scrollFocusedFieldIntoDialogBody(
  scrollEl: HTMLElement,
  target: HTMLElement,
  pad = 12,
): void {
  if (typeof window === "undefined") return;

  const scrollRect = scrollEl.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const vv = window.visualViewport;

  const viewportBottom = vv
    ? vv.offsetTop + vv.height
    : window.innerHeight;
  const keyboardInset = getDialogKeyboardBottomInsetPx();
  const keyboardGap =
    keyboardInset >= 1 ? DIALOG_VISUAL_VIEWPORT_KEYBOARD_GAP_PX : 0;

  const visibleBottom = Math.min(scrollRect.bottom, viewportBottom - keyboardGap);
  const visibleTop = scrollRect.top + pad;

  if (targetRect.bottom > visibleBottom - pad) {
    scrollEl.scrollBy({
      top: targetRect.bottom - visibleBottom + pad,
      behavior: "smooth",
    });
  } else if (targetRect.top < visibleTop) {
    scrollEl.scrollBy({
      top: targetRect.top - visibleTop,
      behavior: "smooth",
    });
  }
}

/**
 * Keeps focused inputs/textareas visible inside a dialog scroll region when the virtual keyboard opens.
 */
export function useDialogScrollOnFocus(
  scrollRef: RefObject<HTMLElement | null>,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) return;
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    let focusTimer: number | undefined;
    let activeTarget: HTMLElement | null = null;

    const scrollActiveTarget = () => {
      if (!activeTarget || !scrollRef.current) return;
      scrollFocusedFieldIntoDialogBody(scrollRef.current, activeTarget);
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.matches(FOCUSABLE_FIELD_SELECTOR)) return;
      if (!scrollEl.contains(target)) return;

      activeTarget = target;
      window.clearTimeout(focusTimer);
      requestAnimationFrame(() => {
        requestAnimationFrame(scrollActiveTarget);
      });
      focusTimer = window.setTimeout(scrollActiveTarget, 320);
    };

    const onFocusOut = () => {
      activeTarget = null;
      window.clearTimeout(focusTimer);
    };

    const onViewportChange = () => {
      if (!activeTarget) return;
      requestAnimationFrame(scrollActiveTarget);
    };

    scrollEl.addEventListener("focusin", onFocusIn);
    scrollEl.addEventListener("focusout", onFocusOut);
    window.visualViewport?.addEventListener("resize", onViewportChange);
    window.visualViewport?.addEventListener("scroll", onViewportChange);

    return () => {
      scrollEl.removeEventListener("focusin", onFocusIn);
      scrollEl.removeEventListener("focusout", onFocusOut);
      window.visualViewport?.removeEventListener("resize", onViewportChange);
      window.visualViewport?.removeEventListener("scroll", onViewportChange);
      window.clearTimeout(focusTimer);
    };
  }, [enabled, scrollRef]);
}
