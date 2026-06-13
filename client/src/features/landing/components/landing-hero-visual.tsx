"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const HeroMatchDemo = dynamic(
  () => import("./hero-match-demo").then((m) => m.HeroMatchDemo),
  {
    ssr: false,
    loading: () => (
      <div
        className="min-h-[280px] w-full rounded-[1.15rem] bg-[oklch(13%_0.012_110/0.55)] animate-pulse"
        aria-hidden
      />
    ),
  },
);

export function LandingHeroVisual() {
  return (
    <div
      className={cn(
        "relative w-full mx-auto select-none pointer-events-none",
        "max-w-full sm:max-w-[420px] lg:max-w-[440px] lg:mx-0 lg:ml-auto",
      )}
    >
      <div
        className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-[radial-gradient(circle,oklch(88%_0.11_105/0.08)_0%,transparent_72%)] blur-2xl"
        aria-hidden
      />
      <div className="relative rounded-[1.35rem] border border-white/6 bg-[oklch(13%_0.012_110/0.55)] p-2 sm:p-2.5 md:backdrop-blur-sm">
        <HeroMatchDemo lite />
      </div>
    </div>
  );
}
