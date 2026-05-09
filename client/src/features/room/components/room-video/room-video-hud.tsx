"use client";

import { type ReactNode } from "react";
import { PictureInPicture2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGE_CHROME_BTN =
  "inline-flex size-10 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-black/55 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40";

/**
 * Top overlay: stage title (when not 1:1 tile-only layout) + **Minimize call** (dock / keep session).
 * Circle rooms use the footer “Options” for rename/invite; minimize is still available here.
 *
 * `stageTrailingActions` (fullscreen, share audio, etc.) shares one row with minimize so controls
 * never stack in the same corner.
 */
export function RoomVideoHud({
  isOneToOneStage,
  activeActivityLabel,
  activeActivity,
  mainStageShowsScreen,
  peerLabel,
  onMinimize,
  stageTrailingActions,
}: {
  isOneToOneStage: boolean;
  activeActivityLabel: string | null;
  activeActivity: boolean;
  mainStageShowsScreen: boolean;
  peerLabel: string;
  onMinimize?: () => void;
  /** e.g. fullscreen + mute screen audio — rendered before minimize, same row */
  stageTrailingActions?: ReactNode;
}) {
  const showRightCluster = Boolean(stageTrailingActions) || Boolean(onMinimize);

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-20 flex select-none items-start justify-between gap-x-2 gap-y-2 px-4 pb-7 pt-4 sm:items-center sm:gap-x-3 md:px-5 md:pt-5",
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

      {showRightCluster ? (
        <div className="pointer-events-auto flex shrink-0 flex-nowrap items-center gap-2">
          {stageTrailingActions}
          {onMinimize ? (
            <button
              type="button"
              onClick={onMinimize}
              aria-label="Minimize to floating call"
              title="Minimize to floating call"
              className={STAGE_CHROME_BTN}
            >
              <PictureInPicture2 size={18} className="shrink-0" aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Shared with `RoomVideoView` trailing actions so fullscreen / PiP use identical chrome. */
export const ROOM_VIDEO_STAGE_CHROME_BTN_CLASS = STAGE_CHROME_BTN;
