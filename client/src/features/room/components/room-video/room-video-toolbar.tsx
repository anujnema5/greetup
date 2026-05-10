"use client";

import { useRef } from "react";
import { allowScreenShareCallControl } from "@/features/rtc/lib/rtc-mobile-profile";
import { useMobileWebRtcUi } from "@/features/rtc/hooks/use-mobile-web-rtc-ui";
import { useNarrowToolbar } from "@/features/room/hooks/use-narrow-toolbar";
import { useRoomVideoToolbarInlineCount } from "@/features/room/hooks/use-room-video-toolbar-inline-count";
import {
  useRoomVideoToolbarSecondaries,
  type RoomVideoToolbarSecondaryId,
} from "@/features/room/hooks/use-room-video-toolbar-secondaries";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutGrid,
  MessageCircle,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  MoreHorizontal,
  MoreVertical,
  PhoneOff,
  Radio,
  SkipForward,
  UserPlus,
  Users,
  Video,
  VideoOff,
} from "lucide-react";
import {
  CircleToolbarButton,
  MediaControlButton,
  TOOLBAR_CONTROL_CAPTION_CLASS,
} from "@/features/room/components/room-video/room-video-primitives";
import { cn } from "@/lib/utils";
import type { RoomCallRightPanelTab } from "@/features/room/types/room-call-panel.types";

/** Outer bar: reads on dark stage; safe-area padding for home indicator + caption row. */
const TOOLBAR_SHELL_CLASS =
  "pointer-events-auto z-30 w-full shrink-0 select-none rounded-xl border border-white/10 bg-[#0c0c0c]/88 pt-3 pb-[max(0.9rem,calc(0.5rem+env(safe-area-inset-bottom)))] shadow-[0_-10px_40px_-8px_rgb(0_0_0_/0.55)] backdrop-blur-2xl";

/** Hide scrollbars on narrow overflow row (Firefox / legacy Edge). */
const HIDE_SCROLLBAR_CLASS =
  "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

/** In-room call control bar (mic/camera, secondaries, hang up). */
export function RoomVideoToolbar({
  onToggleMic,
  onToggleCamera,
  micEnabled,
  cameraEnabled,
  mediaTogglesReady,
  showScreenShare,
  screenSharing,
  onToggleScreenShare,
  conversationId,
  rightPanelTab,
  setRightPanelTab,
  isGroupRoom,
  isLive,
  setIsLive,
  showAddToCircle,
  onOpenAddToCircle,
  showCircleOptions = false,
  onOpenCircleOptions,
  showSkip,
  onSkip,
  onEnd,
  elapsed: _elapsed,
  formatDuration: _formatDuration,
  showPeopleTab = false,
  showActivitiesTab = false,
}: {
  onToggleMic?: () => void;
  onToggleCamera?: () => void;
  micEnabled: boolean;
  cameraEnabled: boolean;
  mediaTogglesReady: boolean;
  showScreenShare: boolean;
  screenSharing: boolean;
  onToggleScreenShare?: () => void;
  conversationId: string | null;
  rightPanelTab: RoomCallRightPanelTab;
  setRightPanelTab: (tab: RoomCallRightPanelTab) => void;
  isGroupRoom: boolean;
  isLive: boolean;
  setIsLive: (value: (prev: boolean) => boolean) => void;
  showAddToCircle: boolean;
  onOpenAddToCircle?: () => void;
  /** Circle call: show footer control that opens rename / invite / link / chat dialog. */
  showCircleOptions?: boolean;
  onOpenCircleOptions?: () => void;
  showSkip: boolean;
  onSkip: () => void;
  onEnd: () => void;
  elapsed: number;
  formatDuration: (seconds: number) => string;
  showPeopleTab?: boolean;
  showActivitiesTab?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const mobileWebCallUi = useMobileWebRtcUi();
  const showScreenShareAction =
    Boolean(showScreenShare && onToggleScreenShare) &&
    allowScreenShareCallControl(mobileWebCallUi, screenSharing);

  const narrowToolbar = useNarrowToolbar();
  const { skipPinnedMobile, toolbarFlowSecondaries } = useRoomVideoToolbarSecondaries(
    narrowToolbar,
    {
      conversationId,
      isGroupRoom,
      showAddToCircle,
      onOpenAddToCircle,
      showCircleOptions,
      onOpenCircleOptions,
      showSkip,
      showPeopleTab,
      showActivitiesTab,
    },
  );

  const inlineSecondaryCount = useRoomVideoToolbarInlineCount(
    rootRef,
    mediaRef,
    endRef,
    narrowToolbar,
    toolbarFlowSecondaries,
    skipPinnedMobile,
  );

  if (!onToggleMic || !onToggleCamera) {
    return null;
  }

  const overflowSecondaries = toolbarFlowSecondaries.slice(inlineSecondaryCount);
  const showOverflowTrigger = !narrowToolbar && overflowSecondaries.length > 0;

  const renderSecondaryButton = (id: RoomVideoToolbarSecondaryId) => {
    switch (id) {
      case "chat":
        return (
          <CircleToolbarButton
            key={id}
            onClick={() => setRightPanelTab("chat")}
            ariaLabel="Open chat panel"
            caption="Chat"
            isActive={rightPanelTab === "chat"}
          >
            <MessageCircle
              size={18}
              className={rightPanelTab === "chat" ? "text-primary" : "text-white/75"}
            />
          </CircleToolbarButton>
        );
      case "participants":
        return (
          <CircleToolbarButton
            key={id}
            onClick={() => setRightPanelTab("participants")}
            ariaLabel="Open people and shared screens"
            caption="People"
            isActive={rightPanelTab === "participants"}
          >
            <Users
              size={18}
              className={rightPanelTab === "participants" ? "text-primary" : "text-white/75"}
            />
          </CircleToolbarButton>
        );
      case "activities":
        return (
          <CircleToolbarButton
            key={id}
            onClick={() => setRightPanelTab("activities")}
            ariaLabel="Open activities panel"
            caption="Activities"
            isActive={rightPanelTab === "activities"}
          >
            <LayoutGrid
              size={18}
              className={rightPanelTab === "activities" ? "text-primary" : "text-white/75"}
            />
          </CircleToolbarButton>
        );
      case "live":
        return (
          <CircleToolbarButton
            key={id}
            onClick={() => setIsLive((prev) => !prev)}
            ariaLabel={isLive ? "Stop live broadcast" : "Start live broadcast"}
            caption={isLive ? "End live" : "Go live"}
            className={isLive ? "bg-red-500/80 hover:bg-red-500" : undefined}
          >
            <Radio size={18} className={isLive ? "text-white" : "text-white/80"} />
          </CircleToolbarButton>
        );
      case "add":
        return onOpenAddToCircle ? (
          <CircleToolbarButton
            key={id}
            onClick={onOpenAddToCircle}
            ariaLabel={
              isGroupRoom ? "Add people to this circle call" : "Add someone to your circle"
            }
            caption={isGroupRoom ? "Add people" : "Add"}
          >
            <UserPlus size={18} className="text-white/80" />
          </CircleToolbarButton>
        ) : null;
      case "circleOptions":
        return onOpenCircleOptions ? (
          <CircleToolbarButton
            key={id}
            onClick={onOpenCircleOptions}
            ariaLabel="Circle options"
            caption="Options"
          >
            <MoreHorizontal size={18} className="text-white/80" />
          </CircleToolbarButton>
        ) : null;
      case "skip":
        return (
          <CircleToolbarButton
            key={id}
            onClick={onSkip}
            ariaLabel="Find next person"
            caption="Next"
          >
            <SkipForward size={18} className="text-white/80" />
          </CircleToolbarButton>
        );
      default:
        return null;
    }
  };

  const renderOverflowMenuItem = (id: RoomVideoToolbarSecondaryId) => {
    switch (id) {
      case "chat":
        return (
          <DropdownMenuItem
            key={id}
            onClick={() => setRightPanelTab("chat")}
            className={rightPanelTab === "chat" ? "bg-accent/50" : undefined}
          >
            <MessageCircle size={16} className={rightPanelTab === "chat" ? "text-primary" : undefined} />
            Chat
          </DropdownMenuItem>
        );
      case "participants":
        return (
          <DropdownMenuItem
            key={id}
            onClick={() => setRightPanelTab("participants")}
            className={rightPanelTab === "participants" ? "bg-accent/50" : undefined}
          >
            <Users size={16} className={rightPanelTab === "participants" ? "text-primary" : undefined} />
            People
          </DropdownMenuItem>
        );
      case "activities":
        return (
          <DropdownMenuItem
            key={id}
            onClick={() => setRightPanelTab("activities")}
            className={rightPanelTab === "activities" ? "bg-accent/50" : undefined}
          >
            <LayoutGrid size={16} className={rightPanelTab === "activities" ? "text-primary" : undefined} />
            Activities
          </DropdownMenuItem>
        );
      case "live":
        return (
          <DropdownMenuItem key={id} onClick={() => setIsLive((prev) => !prev)}>
            <Radio size={16} className={isLive ? "text-destructive" : undefined} />
            {isLive ? "End live" : "Go live"}
          </DropdownMenuItem>
        );
      case "add":
        return onOpenAddToCircle ? (
          <DropdownMenuItem key={id} onClick={onOpenAddToCircle}>
            <UserPlus size={16} />
            {isGroupRoom ? "Add people" : "Add to circle"}
          </DropdownMenuItem>
        ) : null;
      case "circleOptions":
        return onOpenCircleOptions ? (
          <DropdownMenuItem key={id} onClick={onOpenCircleOptions}>
            <MoreHorizontal size={16} />
            Circle options
          </DropdownMenuItem>
        ) : null;
      case "skip":
        return (
          <DropdownMenuItem key={id} onClick={onSkip}>
            <SkipForward size={16} />
            Skip
          </DropdownMenuItem>
        );
      default:
        return null;
    }
  };

  const renderMediaCluster = (showWideDivider: boolean) => (
    <>
      <MediaControlButton
        active={micEnabled}
        onClick={onToggleMic}
        disabled={!mediaTogglesReady}
        ariaLabel={micEnabled ? "Mute microphone" : "Unmute microphone"}
        caption={micEnabled ? "Mute" : "Unmute"}
        iconOn={<Mic size={18} className="text-white/90" />}
        iconOff={<MicOff size={18} className="text-amber-200/95" />}
      />

      <MediaControlButton
        active={cameraEnabled}
        onClick={onToggleCamera}
        disabled={!mediaTogglesReady}
        ariaLabel={cameraEnabled ? "Turn camera off" : "Turn camera on"}
        caption={cameraEnabled ? "Video" : "Camera"}
        iconOn={<Video size={18} className="text-white/90" />}
        iconOff={<VideoOff size={18} className="text-amber-200/95" />}
      />

      {showScreenShareAction ? (
        <MediaControlButton
          active={screenSharing}
          onClick={() => onToggleScreenShare?.()}
          disabled={!mediaTogglesReady}
          ariaLabel={screenSharing ? "Stop sharing screen" : "Share screen"}
          caption={screenSharing ? "Sharing" : "Share"}
          iconOn={<Monitor size={18} className="text-white/90" />}
          iconOff={<MonitorOff size={18} className="text-amber-200/95" />}
        />
      ) : null}

      {narrowToolbar && !isGroupRoom && showPeopleTab ? (
        <CircleToolbarButton
          onClick={() => setRightPanelTab("participants")}
          ariaLabel="Open people and shared screens"
          caption="People"
          isActive={rightPanelTab === "participants"}
        >
          <Users
            size={18}
            className={rightPanelTab === "participants" ? "text-primary" : "text-white/75"}
          />
        </CircleToolbarButton>
      ) : null}
      {narrowToolbar && !isGroupRoom && showActivitiesTab ? (
        <CircleToolbarButton
          onClick={() => setRightPanelTab("activities")}
          ariaLabel="Open activities panel"
          caption="Activities"
          isActive={rightPanelTab === "activities"}
        >
          <LayoutGrid
            size={18}
            className={rightPanelTab === "activities" ? "text-primary" : "text-white/75"}
          />
        </CircleToolbarButton>
      ) : null}

      {showWideDivider ? (
        <div className="hidden h-7 w-px shrink-0 self-center bg-white/20 md:block" aria-hidden />
      ) : null}
    </>
  );

  const narrowScrollStripClass = cn(
    "flex min-w-0 flex-1 items-center gap-1 overflow-x-auto overflow-y-visible overscroll-x-contain",
    HIDE_SCROLLBAR_CLASS,
  );

  return (
    <div ref={rootRef} role="toolbar" aria-label="Call controls" className={TOOLBAR_SHELL_CLASS}>
      <div
        className={cn(
          "flex w-full min-w-0 items-center",
          narrowToolbar
            ? "gap-1 overflow-y-visible px-2"
            : "justify-between gap-3 px-3 sm:gap-4 sm:px-5",
        )}
      >
        {narrowToolbar ? (
          <>
            <div className={narrowScrollStripClass}>
              <div ref={mediaRef} className="flex shrink-0 items-center gap-1 pl-0.5">
                {renderMediaCluster(false)}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {toolbarFlowSecondaries.map((id) => renderSecondaryButton(id))}
                {skipPinnedMobile ? renderSecondaryButton("skip") : null}
              </div>
            </div>

            <div ref={endRef} className="flex shrink-0 items-center">
              <div className="flex w-16 min-w-16 shrink-0 flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={onEnd}
                  aria-label="Leave call"
                  title="Leave call"
                  className={cn(
                    "inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full",
                    "border border-red-500/35 bg-red-600 text-white shadow-md shadow-black/30",
                    "backdrop-blur-sm transition-[background-color,border-color,transform,box-shadow] duration-150",
                    "hover:border-red-400/45 hover:bg-red-700 hover:shadow-lg hover:shadow-black/35",
                    "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:ring-offset-0",
                  )}
                >
                  <PhoneOff size={18} className="text-white" />
                </button>
                <span
                  className={cn(
                    TOOLBAR_CONTROL_CAPTION_CLASS,
                    "flex w-full items-center justify-center whitespace-nowrap",
                  )}
                >
                  Leave
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div
              ref={mediaRef}
              className="flex shrink-0 items-center gap-2.5 pl-0.5 sm:pl-0"
            >
              {renderMediaCluster(true)}
            </div>

            <div className="flex min-w-0 shrink-0 flex-1 items-center justify-center gap-2.5">
              {toolbarFlowSecondaries
                .slice(0, inlineSecondaryCount)
                .map((id) => renderSecondaryButton(id))}
              {skipPinnedMobile ? renderSecondaryButton("skip") : null}
              {showOverflowTrigger ? (
                <DropdownMenu modal={false}>
                  <div className="flex w-16 min-w-16 shrink-0 flex-col items-center gap-1">
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label="More call actions"
                        title="More call actions"
                        className={cn(
                          "inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/18 bg-white/15 p-0 backdrop-blur-md",
                          "transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35",
                          "touch-manipulation active:bg-white/20",
                        )}
                      >
                        <MoreVertical size={18} className="text-white/85" />
                      </button>
                    </DropdownMenuTrigger>
                    <span
                      className={cn(
                        TOOLBAR_CONTROL_CAPTION_CLASS,
                        "flex w-full items-center justify-center whitespace-nowrap",
                      )}
                    >
                      More
                    </span>
                  </div>
                  <DropdownMenuContent
                    side="top"
                    align="end"
                    sideOffset={8}
                    collisionPadding={12}
                    className="z-200 w-52"
                  >
                    {overflowSecondaries.map((id) => renderOverflowMenuItem(id))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>

            <div ref={endRef} className="flex shrink-0 items-center gap-2 sm:gap-3">
              <div className="h-7 w-px shrink-0 self-center bg-white/18" aria-hidden />
              <button
                type="button"
                onClick={onEnd}
                aria-label="Leave call"
                title="Leave call"
                className={cn(
                  "inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full px-5",
                  "border border-red-500/35 bg-red-600 text-sm font-semibold text-white shadow-md shadow-black/30",
                  "backdrop-blur-sm transition-[background-color,border-color,transform,box-shadow] duration-150",
                  "hover:border-red-400/45 hover:bg-red-700 hover:shadow-lg hover:shadow-black/35",
                  "active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:ring-offset-0",
                )}
              >
                <PhoneOff size={16} className="text-white" />
                Leave
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
