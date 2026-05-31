"use client";

import { useEffect, useState } from "react";

/** Subscribes to a CSS media query; defaults to `false` until mounted (SSR-safe). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);

    const onChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** Tailwind `md` breakpoint — desktop split layouts. */
export function useIsMdUp(): boolean {
  return useMediaQuery("(min-width: 768px)");
}
