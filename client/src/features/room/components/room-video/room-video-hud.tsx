"use client";

import { PictureInPicture2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Top overlay: stage title (when not 1:1 tile-only layout) + **Minimize call** (dock / keep session).
 * Circle rooms use the footer “Options” for rename/invite; minimize is still available here.
 */
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

      {onMinimize ? (
        <div className="pointer-events-auto shrink-0">
          <button
            type="button"
            onClick={onMinimize}
            aria-label="Minimize to floating call"
            title="Minimize to floating call"
            className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-black/55 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <PictureInPicture2 size={18} className="shrink-0" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}
