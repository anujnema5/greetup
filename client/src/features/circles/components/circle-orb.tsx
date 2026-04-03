"use client";

import { forwardRef, memo } from "react";
import { UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";

const ORB_SIZE = 148;
const BTN_SIZE = 90;

export const CircleOrb = memo(
  forwardRef<
    HTMLButtonElement,
    React.ComponentPropsWithoutRef<"button"> & { isLoading?: boolean }
  >(function CircleOrb({ className, isLoading, disabled, ...props }, ref) {
    return (
      <div
        className="relative flex items-center justify-center"
        style={{ width: ORB_SIZE, height: ORB_SIZE }}
      >
        <div
          className={cn(
            "absolute rounded-full border border-violet-500/10 transition-opacity duration-500",
            isLoading && "animate-pulse",
          )}
          style={{ inset: 0 }}
        />
        <div
          className="absolute rounded-full border border-violet-400/15 transition-opacity duration-500"
          style={{ inset: 16 }}
        />
        <div
          className="absolute rounded-full blur-xl transition-opacity duration-500 opacity-25"
          style={{ inset: 29, background: "oklch(58% 0.18 290)" }}
        />

        <button
          ref={ref}
          type="button"
          disabled={disabled || isLoading}
          className={cn(
            "relative z-10 flex flex-col items-center justify-center gap-2 rounded-full text-white font-semibold transition-all duration-300 cursor-pointer",
            "hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-card",
            "disabled:opacity-60 disabled:cursor-not-allowed",
            className,
          )}
          style={{
            width: BTN_SIZE,
            height: BTN_SIZE,
            background:
              "radial-gradient(circle at 40% 35%, oklch(72% 0.14 290), oklch(52% 0.16 285))",
            boxShadow:
              "0 0 22px oklch(65% 0.14 290 / 0.35), 0 8px 22px oklch(50% 0.12 285 / 0.25), inset 0 1px 0 oklch(95% 0.02 290 / 0.25)",
          }}
          {...props}
        >
          <div className="absolute inset-0 rounded-full bg-linear-to-b from-white/20 to-transparent" />
          <div className="relative flex flex-col items-center gap-1.5">
            <UsersRound size={20} strokeWidth={2} />
            <span className="text-[11px] font-bold tracking-wide text-center leading-tight px-1">
              Start Circle
            </span>
          </div>
        </button>
      </div>
    );
  }),
);
