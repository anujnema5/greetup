"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

/**
 * Toggles true fullscreen on a container when the browser supports it; otherwise toggles a fixed
 * “immersive” layout class on the same element (works better on some mobile browsers).
 */
export function useStageFullscreen(containerRef: RefObject<HTMLElement | null>) {
  const [layoutImmersive, setLayoutImmersive] = useState(false);
  const [nativeActive, setNativeActive] = useState(false);

  useEffect(() => {
    const onChange = () => {
      const el = document.fullscreenElement;
      setNativeActive(Boolean(el && containerRef.current && el === containerRef.current));
      if (!el) setLayoutImmersive(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [containerRef]);

  const exit = useCallback(async () => {
    setLayoutImmersive(false);
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const toggle = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;

    if (layoutImmersive || nativeActive) {
      await exit();
      return;
    }

    const req =
      el.requestFullscreen?.bind(el) ??
      (el as HTMLElement & { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen?.bind(el);

    if (req) {
      try {
        await req();
        return;
      } catch {
        /* fall through to layout immersive */
      }
    }

    setLayoutImmersive(true);
  }, [containerRef, exit, layoutImmersive, nativeActive]);

  const immersive = layoutImmersive && !nativeActive;

  return {
    toggle,
    exit,
    /** Browser fullscreen is active for our shell. */
    isNativeFullscreen: nativeActive,
    /** CSS fallback: fixed overlay covering the viewport. */
    isLayoutImmersive: immersive,
    /** Either mode — hide duplicate chrome if needed. */
    isExpanded: nativeActive || immersive,
  };
}
