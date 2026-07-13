"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { useReducedMotion } from "framer-motion";

type LandingPerfValue = { isMobile: boolean; lite: boolean; reduceMotion: boolean };

const LandingPerfContext = createContext<LandingPerfValue>({
  isMobile: false,
  lite: false,
  reduceMotion: false,
});

export function useLandingPerf() {
  return useContext(LandingPerfContext);
}

/** Mobile / reduced-motion: drop scroll-linked nav, fixed blur layers, and looping animations. */
export function LandingPerfProvider({ children }: { children: React.ReactNode }) {
  const prefersReduced = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  useLayoutEffect(() => {
    const mq = globalThis.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const reduceMotion = Boolean(prefersReduced);
  const lite = reduceMotion || isMobile;
  const value = useMemo(() => ({ isMobile, lite, reduceMotion }), [isMobile, lite, reduceMotion]);

  return <LandingPerfContext.Provider value={value}>{children}</LandingPerfContext.Provider>;
}
