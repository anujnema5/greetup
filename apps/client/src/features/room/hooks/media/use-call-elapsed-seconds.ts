"use client";

import { useEffect, useState } from "react";

/** Wall-clock style counter while `active` is true (1 Hz). */
export function useCallElapsedSeconds(active: boolean): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [active]);

  return elapsed;
}
