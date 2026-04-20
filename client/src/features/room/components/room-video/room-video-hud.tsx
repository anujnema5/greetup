"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Minimize2 } from "lucide-react";

type StageRatio = "16:9" | "1:1";

export function RoomVideoHud({
  isOneToOneStage,
  isGroupRoom,
  activeActivityLabel,
  activeActivity,
  mainStageShowsScreen,
  peerLabel,
  stageRatio,
  setStageRatio,
  onMinimize,
  elapsed,
  formatDuration,
}: {
  isOneToOneStage: boolean;
  isGroupRoom: boolean;
  activeActivityLabel: string | null;
  activeActivity: boolean;
  mainStageShowsScreen: boolean;
  peerLabel: string;
  stageRatio: StageRatio;
  setStageRatio: (ratio: StageRatio) => void;
  onMinimize?: () => void;
  elapsed: number;
  formatDuration: (seconds: number) => string;
}) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-start justify-between gap-x-2 gap-y-2 px-4 pb-7 pt-4 sm:items-center sm:gap-x-3 md:px-5 md:pt-5"
      style={{
        background: "linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)",
        userSelect: "none",
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-initial">
        <div className="min-w-0">
          {!isOneToOneStage ? (
            <>
              <p className="truncate text-xs font-semibold leading-none text-white md:text-sm">
                {activeActivityLabel ??
                  (mainStageShowsScreen ? "Screen share" : peerLabel)}
              </p>
              {(mainStageShowsScreen || activeActivity) && (
                <p className="mt-0.5 truncate text-[11px] text-white/60">{peerLabel}</p>
              )}
            </>
          ) : null}
        </div>
      </div>

      <div className="pointer-events-auto ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
        {!isGroupRoom ? (
          <div className="flex items-center overflow-hidden rounded-full border border-white/20 bg-black/50 shadow-sm">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStageRatio("16:9")}
              className={cn(
                "h-auto rounded-none px-2.5 py-1 text-[11px] font-semibold text-white/70 transition-colors",
                stageRatio === "16:9" && "bg-white/15 text-white",
              )}
            >
              16:9
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStageRatio("1:1")}
              className={cn(
                "h-auto rounded-none px-2.5 py-1 text-[11px] font-semibold text-white/70 transition-colors",
                stageRatio === "1:1" && "bg-white/15 text-white",
              )}
            >
              1:1
            </Button>
          </div>
        ) : null}
        {onMinimize ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onMinimize}
            aria-label="Minimize call"
            className="h-9 w-9 rounded-full text-white/90 transition-colors hover:bg-white/10"
            style={{
              background: "rgba(0,0,0,0.45)",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(8px)",
            }}
          >
            <Minimize2 size={16} strokeWidth={2} />
          </Button>
        ) : null}
        <div
          className="rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold text-white/70 md:px-2.5 md:text-[11px]"
          style={{
            background: "rgba(0,0,0,0.45)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(8px)",
          }}
        >
          {formatDuration(elapsed)}
        </div>
      </div>
    </div>
  );
}
