"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Hold the matched "Live" snapshot before the story loop begins. */
const MATCH_DEMO_PREVIEW_MS = 2600;

const HeroMatchDemo = dynamic(
  () => import("./hero-match-demo").then((m) => m.HeroMatchDemo),
  {
    ssr: false,
    loading: () => (
      <div
        className="min-h-[280px] w-full rounded-[1.15rem] bg-card/55 animate-pulse"
        aria-hidden
      />
    ),
  },
);

export function LandingHeroVisual() {
  const reduceMotion = Boolean(useReducedMotion());
  const [loopActive, setLoopActive] = useState(false);

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setTimeout(() => setLoopActive(true), MATCH_DEMO_PREVIEW_MS);
    return () => window.clearTimeout(id);
  }, [reduceMotion]);

  const lite = reduceMotion || !loopActive;

  return (
    <div
      className={cn(
        "relative w-full mx-auto select-none pointer-events-none",
        "max-w-full sm:max-w-[420px] lg:max-w-[440px] lg:mx-0 lg:ml-auto",
      )}
    >
      <div
        className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-primary/8 blur-2xl"
        aria-hidden
      />
      <div className="relative rounded-[1.35rem] border border-border bg-card/55 p-2 sm:p-2.5 md:backdrop-blur-sm">
        <HeroMatchDemo lite={lite} />
      </div>
    </div>
  );
}
