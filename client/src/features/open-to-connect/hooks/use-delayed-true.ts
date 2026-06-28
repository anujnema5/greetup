"use client";

import { useEffect, useState } from "react";

/** Becomes true after `delayMs` while `active` stays true; resets when inactive. */
export function useDelayedTrue(active: boolean, delayMs: number): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!active) {
      setReady(false);
      return;
    }
    const timer = window.setTimeout(() => setReady(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [active, delayMs]);

  return ready;
}
