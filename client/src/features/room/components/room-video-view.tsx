"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Minimize2, PhoneOff, SkipForward, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { MOCK_MATCH } from "../constants/mock-match";

export function RoomVideoView({
  onEnd,
  onSkip,
  onMinimize,
}: {
  onEnd: () => void;
  onSkip: () => void;
  /** Collapse to floating dock and return to the previous route. */
  onMinimize?: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const shell = (className: string) => (
    <div className={cn("flex flex-col overflow-hidden bg-background", className)}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${MOCK_MATCH.gradFrom}33, var(--card) 60%, ${MOCK_MATCH.gradTo}22)`,
          }}
        />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div
              className="flex h-32 w-32 items-center justify-center rounded-full text-3xl font-bold text-white transition-all duration-300 md:h-36 md:w-36 md:text-4xl"
              style={{
                background: `linear-gradient(135deg, ${MOCK_MATCH.gradFrom}, ${MOCK_MATCH.gradTo})`,
                boxShadow: `0 0 60px ${MOCK_MATCH.gradFrom}55, 0 0 120px ${MOCK_MATCH.gradFrom}22`,
              }}
            >
              {MOCK_MATCH.initials}
            </div>
            <div
              className="absolute -inset-3 animate-pulse rounded-full"
              style={{
                background: `radial-gradient(circle, ${MOCK_MATCH.gradFrom}30, transparent 70%)`,
                animationDuration: "2.5s",
              }}
            />
          </div>
        </div>

        <div
          className="absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-x-2 gap-y-2 px-3 pb-6 pt-3 sm:items-center sm:gap-x-3 md:px-4 md:pt-4"
          style={{
            background: "linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)",
            userSelect: "none",
          }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-initial">
            
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold leading-none text-white md:text-sm">
                {MOCK_MATCH.name}
              </p>
              <p className="mt-0.5 truncate text-[10px] text-white/50 md:text-[11px]">
                {MOCK_MATCH.tagline}
              </p>
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            {onMinimize && (
              <button
                type="button"
                onClick={onMinimize}
                aria-label="Minimize call"
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/10 sm:h-10 sm:w-10"
                style={{
                  background: "rgba(0,0,0,0.45)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <Minimize2 size={18} strokeWidth={2} />
              </button>
            )}
            <div
              className="rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold text-white/70 md:px-2.5 md:text-[11px]"
              style={{
                background: "rgba(0,0,0,0.45)",
                border: "1px solid rgba(255,255,255,0.1)",
                backdropFilter: "blur(8px)",
              }}
            >
              {fmt(elapsed)}
            </div>
          </div>
        </div>

        <div
          className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 md:bottom-5 md:left-5 md:px-3 md:py-1.5"
          style={{
            background: "rgba(0,0,0,0.4)",
            border: "1px solid oklch(88% 0.11 105 / 0.2)",
            backdropFilter: "blur(8px)",
          }}
        >
          <Sparkles size={11} style={{ color: "oklch(88% 0.11 105)" }} />
          <span
            className="text-[11px] font-semibold"
            style={{ color: "oklch(88% 0.11 105)" }}
          >
            {MOCK_MATCH.vibeScore}% match
          </span>
        </div>

        <div
          className="absolute bottom-3 right-3 h-[104px] w-[80px] overflow-hidden rounded-xl transition-all duration-300 sm:bottom-4 sm:right-4 sm:h-[120px] sm:w-[90px] sm:rounded-2xl md:bottom-6 md:right-6 md:h-[150px] md:w-[110px]"
          style={{
            border: "2px solid rgba(255,255,255,0.15)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              background: "linear-gradient(135deg, oklch(30% 0.04 105), oklch(20% 0.02 110))",
            }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold md:h-10 md:w-10"
              style={{
                background:
                  "radial-gradient(circle at 40% 35%, oklch(90% 0.11 105), oklch(78% 0.10 105))",
                color: "oklch(20% 0.03 110)",
              }}
            >
              A
            </div>
          </div>
          <div className="absolute bottom-1 left-0 right-0 text-center">
            <span className="text-[8px] font-medium text-white/60 md:text-[9px]">You</span>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "flex shrink-0 items-center justify-center gap-6 border-t border-border px-4 py-3 sm:gap-8 sm:px-6 sm:py-4",
          "bg-muted/50 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:bg-[oklch(11%_0.012_110)] sm:pb-4"
        )}
        style={{ userSelect: "none" }}
      >
        <ToolbarAction
          label="Skip"
          onClick={onSkip}
          icon={<SkipForward size={20} className="text-foreground/75 dark:text-white/80" />}
          variant="secondary"
          size={56}
        />
        <ToolbarAction
          label="End call"
          onClick={onEnd}
          icon={<PhoneOff size={20} className="text-white" />}
          variant="danger"
          size={60}
        />
      </div>
    </div>
  );

  return shell("h-full min-h-0 w-full min-w-0");
}

function ToolbarAction({
  label,
  onClick,
  icon,
  variant,
  size,
}: {
  label: string;
  onClick: () => void;
  icon: ReactNode;
  variant: "secondary" | "danger";
  size: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[44px] min-w-[44px] cursor-pointer flex-col items-center justify-center gap-1.5 active:opacity-90 md:min-h-0 md:min-w-0 md:gap-2"
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-xl transition-all duration-200",
          variant === "danger"
            ? "bg-red-500 hover:bg-red-400"
            : "border border-border bg-muted/60 hover:bg-muted dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
        )}
        style={{ width: size, height: size - 4 }}
      >
        {icon}
      </div>
      <span className="text-[9px] text-muted-foreground md:text-[10px] dark:text-white/45">{label}</span>
    </button>
  );
}
