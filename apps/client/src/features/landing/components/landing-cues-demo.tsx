"use client";

import { motion } from "framer-motion";
import { Mic, PhoneOff, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLandingPerf } from "../hooks/use-landing-perf";
import { LANDING_CUES_DEMO_CUE } from "../lib/landing-conversation-cues";
import { LandingConversationCueToast } from "./landing-conversation-cue-toast";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function LandingCuesDemo() {
  const { lite } = useLandingPerf();

  return (
    <div className="relative w-full max-w-md sm:max-w-lg lg:max-w-xl mx-auto">
      <div className="rounded-[1.35rem] border border-border bg-card overflow-hidden shadow-2xl shadow-foreground/10">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold landing-card-title leading-none">Sofia L.</p>
            <p className="text-[10px] landing-muted mt-0.5">1:1 video · matched 12s ago</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-emerald-500/15 px-2.5 py-1 sm:px-3 sm:py-1 shrink-0">
            <div className="size-2 rounded-full bg-emerald-400" />
            <span className="text-[11px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400">Live</span>
          </div>
        </div>

        <div className="relative aspect-[4/3] bg-muted">
          <div className="absolute inset-0 landing-mockup-panel" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="size-14 rounded-full bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center text-lg font-bold text-white">
                S
              </div>
              <p className="text-[11px] landing-muted">Sofia L.</p>
            </div>
          </div>

          {/* local pip — top-right on mobile/tablet so cue can sit centered at bottom */}
          <div className="absolute top-3 right-3 lg:top-auto lg:bottom-3 lg:right-3 w-14 h-[4.25rem] sm:w-16 sm:h-20 lg:w-[4.5rem] lg:h-[5.5rem] rounded-xl landing-mockup-panel border border-border flex items-center justify-center">
            <div className="size-7 sm:size-8 rounded-full bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
              Y
            </div>
          </div>

          {/* cue toast — full width centered on mobile/tablet; compact left on desktop */}
          <div className="absolute inset-x-3 bottom-3 flex justify-center lg:inset-x-auto lg:left-4 lg:right-auto lg:bottom-4 lg:max-w-[min(82%,17.5rem)] xl:max-w-[19rem]">
            <motion.div
              className="w-full lg:w-auto"
              initial={lite ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <LandingConversationCueToast
                cue={LANDING_CUES_DEMO_CUE}
                className="px-3 py-2.5 sm:px-4 sm:py-3"
              />
            </motion.div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 border-t border-border px-4 py-3.5">
          {[
            { icon: Mic, active: true },
            { icon: Video, active: true },
            { icon: PhoneOff, active: false, danger: true },
          ].map(({ icon: Icon, active, danger }, i) => (
            <div
              key={i}
              className={cn(
                "size-9 rounded-full flex items-center justify-center",
                danger
                  ? "bg-red-500/90 text-white"
                  : "bg-muted border border-border landing-muted",
              )}
            >
              <Icon className="size-4" />
            </div>
          ))}
        </div>
      </div>

      <p className="mt-3 text-center text-[11px] landing-muted">
        One or two hints per call — spaced out, not a constant stream.
      </p>
    </div>
  );
}
