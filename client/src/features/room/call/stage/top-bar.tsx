"use client";

import { type ReactNode } from "react";
import { PictureInPicture2 } from "lucide-react";
import { SpaceCallTitleBadge } from "@/features/room/call/components/space-call-title-badge";
import { DEFAULT_SPACE_DISPLAY_TITLE } from "@/features/room/constants/call/space-display";
import { CALL_STAGE_CHROME_BTN_CLASS } from "@/features/room/constants/call/call-chrome-theme";
import { cn } from "@/lib/utils";

/**
 * Top overlay: stage title (when not 1:1 tile-only layout) + **Minimize call** (dock / keep session).
 * Space rooms: compact title on stage (host edit opens rename dialog); footer “Options” for invite/link/chat.
 *
 * `stageTrailingActions` (fullscreen, share audio, etc.) shares one row with minimize so controls
 * never stack in the same corner.
 */
export function CallTopBar({
  isOneToOneStage,
  isGroupRoom = false,
  spaceDisplayTitle = null,
  canEditSpaceTitle = false,
  onEditSpaceTitle,
  activeActivityLabel,
  activeActivity,
  mainStageShowsScreen,
  peerLabel,
  onMinimize,
  stageTrailingActions,
}: {
  isOneToOneStage: boolean;
  isGroupRoom?: boolean;
  spaceDisplayTitle?: string | null;
  canEditSpaceTitle?: boolean;
  onEditSpaceTitle?: () => void;
  activeActivityLabel: string | null;
  activeActivity: boolean;
  mainStageShowsScreen: boolean;
  peerLabel: string;
  onMinimize?: () => void;
  /** e.g. fullscreen + mute screen audio — rendered before minimize, same row */
  stageTrailingActions?: ReactNode;
}) {
  const spaceTitle = spaceDisplayTitle?.trim() || DEFAULT_SPACE_DISPLAY_TITLE;
  const showRightCluster = Boolean(stageTrailingActions) || Boolean(onMinimize);

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-20 flex select-none items-start justify-between gap-x-2 sm:items-center sm:gap-x-2",
        isGroupRoom
          ? "gap-y-1 px-3 pb-1 pt-2 md:px-4 md:pt-3"
          : "gap-y-2 px-4 pb-7 pt-4 md:px-5 md:pt-5",
        !activeActivity &&
          (isGroupRoom
            ? "bg-linear-to-b from-black/35 to-transparent"
            : "bg-linear-to-b from-black/75 to-transparent"),
      )}
    >
      <div className="flex min-w-0 shrink items-center sm:flex-initial">
        <div className="min-w-0">
          {!isOneToOneStage && !activeActivity ? (
            isGroupRoom ? (
              <SpaceCallTitleBadge
                title={spaceTitle}
                canEdit={canEditSpaceTitle}
                onEdit={onEditSpaceTitle}
              />
            ) : (
              <>
                <p className="truncate text-xs font-semibold leading-none text-white md:text-sm">
                  {activeActivityLabel ??
                    (mainStageShowsScreen ? "Screen share" : peerLabel)}
                </p>
                {mainStageShowsScreen ? (
                  <p className="mt-0.5 truncate text-[11px] text-white/60">{peerLabel}</p>
                ) : null}
              </>
            )
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
              className={CALL_STAGE_CHROME_BTN_CLASS}
            >
              <PictureInPicture2 size={18} className="shrink-0" aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Shared with `InCallScreen` trailing actions so fullscreen / PiP use identical chrome. */
export { CALL_STAGE_CHROME_BTN_CLASS } from "@/features/room/constants/call/call-chrome-theme";
