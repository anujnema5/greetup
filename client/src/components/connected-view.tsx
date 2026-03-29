'use client'

import { useState, useEffect, type ReactNode } from "react";
import { PhoneOff, SkipForward, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export const MOCK_MATCH = {
  name: "Zara K.",
  initials: "ZK",
  gradFrom: "#7c3aed",
  gradTo: "#4f46e5",
  tagline: "Product designer · Startup founder",
  vibes: ["design", "startups", "indie music"],
  mutual: 3,
  vibeScore: 94,
};

export type ConnectedViewVariant = "room" | "pip";

export function ConnectedView({
  onEnd,
  onSkip,
  variant,
}: {
  onEnd: () => void;
  onSkip: () => void;
  variant: ConnectedViewVariant;
}) {
  const [elapsed, setElapsed] = useState(0);

  const isPip = variant === "pip";

  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const shell = (className: string) => (
    <div className={cn("flex flex-col overflow-hidden bg-[oklch(8%_0.01_110)]", className)}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${MOCK_MATCH.gradFrom}33, oklch(8% 0.01 110) 60%, ${MOCK_MATCH.gradTo}22)`,
          }}
        />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div
              className={cn(
                "flex items-center justify-center rounded-full font-bold text-white transition-all duration-300",
                isPip ? "h-24 w-24 text-2xl" : "h-32 w-32 text-3xl md:h-36 md:w-36 md:text-4xl"
              )}
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
          className="absolute inset-x-0 top-0 flex items-center justify-between px-3 pb-6 pt-3 md:px-4 md:pt-4"
          style={{
            background: "linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)",
            userSelect: "none",
          }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <div
              className="flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 md:px-2.5"
              style={{
                background: "rgba(0,0,0,0.45)",
                border: "1px solid rgba(255,255,255,0.1)",
                backdropFilter: "blur(8px)",
              }}
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
              <span className="text-[9px] font-bold tracking-widest text-white md:text-[10px]">
                LIVE
              </span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold leading-none text-white md:text-sm">
                {MOCK_MATCH.name}
              </p>
              <p className="mt-0.5 truncate text-[10px] text-white/50 md:text-[11px]">
                {MOCK_MATCH.tagline}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 md:gap-1.5">
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
          <Sparkles size={isPip ? 10 : 11} style={{ color: "oklch(88% 0.11 105)" }} />
          <span
            className={cn("font-semibold", isPip ? "text-[10px]" : "text-[11px]")}
            style={{ color: "oklch(88% 0.11 105)" }}
          >
            {MOCK_MATCH.vibeScore}% match
          </span>
        </div>

        <div
          className={cn(
            "absolute overflow-hidden rounded-2xl transition-all duration-300",
            isPip
              ? "bottom-2 right-2 h-[100px] w-[72px]"
              : "bottom-3 right-3 h-[120px] w-[90px] md:bottom-6 md:right-6 md:h-[150px] md:w-[110px]"
          )}
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
              className={cn(
                "flex items-center justify-center rounded-full font-bold",
                isPip ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm"
              )}
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
          "flex shrink-0 items-center justify-center gap-4 border-t border-[oklch(20%_0.012_110)] px-3 py-2.5 md:gap-8 md:px-6 md:py-4",
          "bg-[oklch(11%_0.012_110)]"
        )}
        style={{ userSelect: "none" }}
      >
        <ToolbarAction
          label="Skip"
          onClick={onSkip}
          icon={<SkipForward size={isPip ? 18 : 20} className="text-white/80" />}
          variant="secondary"
          size={isPip ? 48 : 56}
        />
        <ToolbarAction
          label="End call"
          onClick={onEnd}
          icon={<PhoneOff size={isPip ? 18 : 20} className="text-white" />}
          variant="danger"
          size={isPip ? 52 : 60}
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
    <button type="button" onClick={onClick} className="group flex cursor-pointer flex-col items-center gap-1.5 md:gap-2">
      <div
        className={cn(
          "flex items-center justify-center rounded-xl transition-all duration-200",
          variant === "danger"
            ? "bg-red-500 hover:bg-red-400"
            : "border border-white/15 bg-white/5 hover:bg-white/10"
        )}
        style={{ width: size, height: size - 4 }}
      >
        {icon}
      </div>
      <span className="text-[9px] text-white/45 md:text-[10px]">{label}</span>
    </button>
  );
}
