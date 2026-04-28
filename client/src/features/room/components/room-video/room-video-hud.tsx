"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  showAspectRatioToggle,
  onMinimize,
}: {
  isOneToOneStage: boolean;
  isGroupRoom: boolean;
  activeActivityLabel: string | null;
  activeActivity: boolean;
  mainStageShowsScreen: boolean;
  peerLabel: string;
  stageRatio: StageRatio;
  setStageRatio: (ratio: StageRatio) => void;
  showAspectRatioToggle: boolean;
  onMinimize?: () => void;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-10 flex select-none items-start justify-between gap-x-2 gap-y-2 px-4 pb-7 pt-4 sm:items-center sm:gap-x-3 md:px-5 md:pt-5",
        !activeActivity && "bg-linear-to-b from-black/75 to-transparent",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-initial">
        <div className="min-w-0">
          {!isOneToOneStage && !activeActivity ? (
            <>
              <p className="truncate text-xs font-semibold leading-none text-white md:text-sm">
                {activeActivityLabel ??
                  (mainStageShowsScreen ? "Screen share" : peerLabel)}
              </p>
              {mainStageShowsScreen && (
                <p className="mt-0.5 truncate text-[11px] text-white/60">{peerLabel}</p>
              )}
            </>
          ) : null}
        </div>
      </div>

      <div className="pointer-events-auto ml-auto flex shrink-0 items-center gap-2.5 pl-2 max-[420px]:gap-1.5 max-[420px]:pl-1 sm:gap-2.5">
        {showAspectRatioToggle ? (
          <div className="flex shrink-0 items-center overflow-hidden rounded-full border border-white/20 bg-black/50 shadow-sm">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStageRatio("16:9")}
              className={cn(
                "h-auto rounded-none px-2.5 py-1 text-[11px] font-semibold text-white/70 transition-colors max-[420px]:px-2",
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
                "h-auto rounded-none px-2.5 py-1 text-[11px] font-semibold text-white/70 transition-colors max-[420px]:px-2",
                stageRatio === "1:1" && "bg-white/15 text-white",
              )}
            >
              1:1
            </Button>
          </div>
        ) : null}
        {/* Minimize control hidden for room UI. */}
        {onMinimize ? null : null}
      </div>
    </div>
  );
}
