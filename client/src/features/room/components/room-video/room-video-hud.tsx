"use client";

import { cn } from "@/lib/utils";

/** Top overlay for direct calls only. Circle rooms use the footer “Options” control for circle settings. */
export function RoomVideoHud({
  isOneToOneStage,
  activeActivityLabel,
  activeActivity,
  mainStageShowsScreen,
  peerLabel,
  onMinimize,
}: {
  isOneToOneStage: boolean;
  activeActivityLabel: string | null;
  activeActivity: boolean;
  mainStageShowsScreen: boolean;
  peerLabel: string;
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
        <div className="min-w-0 flex-1">
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

      {/* Minimize control hidden for room UI. */}
      {onMinimize ? null : null}
    </div>
  );
}
