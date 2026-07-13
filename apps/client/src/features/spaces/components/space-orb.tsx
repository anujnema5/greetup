"use client";

import { forwardRef, memo } from "react";
import { UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";

export const SpaceOrb = memo(
  forwardRef<
    HTMLButtonElement,
    React.ComponentPropsWithoutRef<"button"> & { isLoading?: boolean }
  >(function SpaceOrb({ className, isLoading, disabled, ...props }, ref) {
    return (
      <div className="space-orb-shell">
        <div
          className={cn(
            "space-orb-ring-outer",
            isLoading && "animate-pulse",
          )}
        />
        <div className="space-orb-ring-mid" />
        <div className="space-orb-glow" />

        <button
          ref={ref}
          type="button"
          disabled={disabled || isLoading}
          className={cn("space-orb-btn", className)}
          {...props}
        >
          <div className="absolute inset-0 rounded-full bg-linear-to-b from-white/20 to-transparent" />
          <div className="relative flex flex-col items-center gap-1.5">
            <UsersRound size={20} strokeWidth={2} />
            <span className="px-1 text-center text-[11px] font-bold leading-tight tracking-wide">
              Start Space
            </span>
          </div>
        </button>
      </div>
    );
  }),
);
