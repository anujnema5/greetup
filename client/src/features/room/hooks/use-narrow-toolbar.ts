"use client";

import { useSyncExternalStore } from "react";

/** Tailwind `md` — toolbar uses compact / scroll layout below this width */
export const NARROW_TOOLBAR_MEDIA_QUERY = "(max-width: 767px)";

function subscribeNarrowToolbar(onChange: () => void) {
  const mq = window.matchMedia(NARROW_TOOLBAR_MEDIA_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getNarrowToolbarSnapshot() {
  return window.matchMedia(NARROW_TOOLBAR_MEDIA_QUERY).matches;
}

function getNarrowToolbarServerSnapshot() {
  return false;
}

export function useNarrowToolbar(): boolean {
  return useSyncExternalStore(
    subscribeNarrowToolbar,
    getNarrowToolbarSnapshot,
    getNarrowToolbarServerSnapshot,
  );
}
