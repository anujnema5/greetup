"use client";

import { useRef, useState, type ReactNode } from "react";
import { allowScreenShareCallControl } from "@/features/rtc/lib/rtc-mobile-profile";
import { useMobileWebRtcUi } from "@/features/rtc/hooks/use-mobile-web-rtc-ui";
import { useNarrowToolbar } from "@/features/room/hooks/toolbar/use-narrow-toolbar";
import { useRoomVideoToolbarInlineCount } from "@/features/room/hooks/toolbar/use-room-video-toolbar-inline-count";
import {
  useRoomVideoToolbarSecondaries,
  type RoomVideoToolbarSecondaryId,
} from "@/features/room/hooks/toolbar/use-room-video-toolbar-secondaries";
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
  ChevronDown,
  MoreHorizontal,
  MoreVertical,
  PhoneOff,
  Radio,
  SkipForward,
  UserPlus,
  Users,
  Ban,
  Video,
  VideoOff,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import {
  CALL_ROOM_FORCED_DARK_CLASS,
  CALL_TOOLBAR_DIVIDER_CLASS,
  CALL_TOOLBAR_ICON_ACTIVE_CLASS,
  CALL_TOOLBAR_ICON_IDLE_CLASS,
  CALL_TOOLBAR_ICON_OFF_CLASS,
  CALL_TOOLBAR_ICON_ON_CLASS,
  CALL_TOOLBAR_MORE_BUTTON_CLASS,
  CALL_TOOLBAR_SHELL_CLASS,
} from "@/features/room/constants/call/call-chrome-theme";
import { getSessionExitCopy } from "@/features/room/constants/call/session-exit-copy";
import {
  CircleToolbarButton,
  MediaControlButton,
  TOOLBAR_CONTROL_CAPTION_CLASS,
} from "@/features/room/call/tiles/tile-primitives";
import { cn } from "@/lib/utils";
import type { RoomCallRightPanelTab } from "@/features/room/types/call/room-call-panel.types";

/** Outer bar shell — theme-aware for light and dark stage. */
const TOOLBAR_SHELL_CLASS = CALL_TOOLBAR_SHELL_CLASS;

/** Hide scrollbars on narrow overflow row (Firefox / legacy Edge). */
const HIDE_SCROLLBAR_CLASS =
  "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

const END_CALL_SOLO_CLASS = cn(
  "inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full",
  "border border-red-500/40 bg-red-600 text-white shadow-lg shadow-black/35",
  "transition-[background-color,transform,box-shadow] duration-150",
  "hover:border-red-400/50 hover:bg-red-700 hover:shadow-xl hover:shadow-black/40",
  "active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/55 focus-visible:ring-offset-0",
);

const END_CALL_SPLIT_SHELL_CLASS = cn(
  "flex h-11 shrink-0 items-stretch overflow-hidden rounded-full",
  "border border-red-500/40 bg-red-600 text-white shadow-lg shadow-black/35",
);

const END_CALL_SPLIT_SEGMENT_CLASS = cn(
  "inline-flex cursor-pointer items-center justify-center text-white",
  "transition-colors duration-150 hover:bg-red-700 active:bg-red-800",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-300/60",
);

function EndCallToolbarCaption({ children }: { children: ReactNode }) {
  return (
    <span
      className={cn(
        TOOLBAR_CONTROL_CAPTION_CLASS,
        "flex w-full items-center justify-center whitespace-nowrap",
      )}
    >
      {children}
    </span>
  );
}

const SESSION_EXIT_BUTTON_LABEL_CLASS =
  "whitespace-nowrap text-[13px] font-semibold tracking-tight leading-none";

/** Leave control; space hosts get a chevron for “end for everyone”. */
function LeaveCallEndControl({
  onEnd,
  hostEndForEveryoneEnabled,
  onOpenHostEndForEveryone,
  compact,
  isGroupRoom,
}: {
  onEnd: () => void;
  hostEndForEveryoneEnabled: boolean;
  onOpenHostEndForEveryone: () => void;
  /** Narrow toolbar: icon-only + caption below (matches mic/camera). */
  compact: boolean;
  isGroupRoom: boolean;
}) {
  const copy = getSessionExitCopy({
    isGroupRoom,
    hostCanEndForEveryone: hostEndForEveryoneEnabled,
  });

  const label = (
    <span className={SESSION_EXIT_BUTTON_LABEL_CLASS}>{copy.leaveButtonLabel}</span>
  );

  const soloButton = (
    <button
      type="button"
      onClick={onEnd}
      aria-label={copy.leaveAriaLabel}
      title={copy.leaveTitle}
      className={cn(END_CALL_SOLO_CLASS, compact ? "size-11 gap-0 px-0" : "px-5")}
    >
      <PhoneOff size={compact ? 18 : 16} className="shrink-0" aria-hidden />
      {!compact ? label : null}
    </button>
  );

  const splitButton = (
    <div className={cn(END_CALL_SPLIT_SHELL_CLASS, compact ? "w-full" : "min-w-0")}>
      <button
        type="button"
        onClick={onEnd}
        aria-label={copy.leaveAriaLabel}
        title={copy.leaveTitle}
        className={cn(
          END_CALL_SPLIT_SEGMENT_CLASS,
          "h-full min-w-0 flex-1",
          compact ? "w-9 px-0" : "gap-2 px-3.5 sm:px-4",
        )}
      >
        <PhoneOff size={compact ? 18 : 16} className="shrink-0" aria-hidden />
        {!compact ? label : null}
      </button>
      <span className="my-2 w-px shrink-0 bg-red-300/35" aria-hidden />
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={copy.moreOptionsAriaLabel}
            title={copy.moreOptionsTitle}
            className={cn(END_CALL_SPLIT_SEGMENT_CLASS, "h-full w-9 shrink-0 sm:w-10")}
          >
            <ChevronDown size={15} strokeWidth={2.25} aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="z-200 w-56"
        >
          <DropdownMenuItem
            onSelect={onOpenHostEndForEveryone}
            aria-label={copy.hostEndForEveryoneMenuAriaLabel}
            className={cn(
              "text-amber-800 dark:text-amber-300",
              "focus:bg-amber-500/15 focus:text-amber-950",
              "dark:focus:bg-amber-500/25 dark:focus:text-amber-50",
              "[&_svg]:text-current!",
            )}
          >
            <Ban size={16} />
            {copy.hostEndForEveryoneMenuLabel}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const control = hostEndForEveryoneEnabled ? splitButton : soloButton;

  if (compact) {
    return (
      <div
        className={cn(
          "flex shrink-0 flex-col items-center gap-1",
          hostEndForEveryoneEnabled ? "w-18 min-w-18" : "w-16 min-w-16",
        )}
      >
        {control}
        <EndCallToolbarCaption>{copy.leaveCaption}</EndCallToolbarCaption>
      </div>
    );
  }

  return <div className="shrink-0">{control}</div>;
}

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
  showAddToSpace,
  onOpenAddToSpace,
  showSpaceOptions = false,
  onOpenSpaceOptions,
  showSkip,
  onSkip,
  onEnd,
  onHostEndSpaceForEveryone,
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
  showAddToSpace: boolean;
  onOpenAddToSpace?: () => void;
  /** Space call: show footer control that opens rename / invite / link / chat dialog. */
  showSpaceOptions?: boolean;
  onOpenSpaceOptions?: () => void;
  showSkip: boolean;
  onSkip: () => void;
  onEnd: () => void;
  /** Space host: ends the DB session for everyone (optional; omit for guests / non-space sessions). */
  onHostEndSpaceForEveryone?: () => void;
  showPeopleTab?: boolean;
  showActivitiesTab?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [hostEndForEveryoneDialogOpen, setHostEndForEveryoneDialogOpen] = useState(false);

  const openHostEndForEveryoneDialog = () => setHostEndForEveryoneDialogOpen(true);

  const hostEndForEveryoneEnabled = isGroupRoom && Boolean(onHostEndSpaceForEveryone);
  const sessionExitCopy = getSessionExitCopy({
    isGroupRoom,
    hostCanEndForEveryone: hostEndForEveryoneEnabled,
  });

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
      showAddToSpace,
      onOpenAddToSpace,
      showSpaceOptions,
      onOpenSpaceOptions,
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
              className={rightPanelTab === "chat" ? CALL_TOOLBAR_ICON_ACTIVE_CLASS : CALL_TOOLBAR_ICON_IDLE_CLASS}
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
              className={rightPanelTab === "participants" ? CALL_TOOLBAR_ICON_ACTIVE_CLASS : CALL_TOOLBAR_ICON_IDLE_CLASS}
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
              className={rightPanelTab === "activities" ? CALL_TOOLBAR_ICON_ACTIVE_CLASS : CALL_TOOLBAR_ICON_IDLE_CLASS}
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
            <Radio size={18} className={isLive ? "text-white" : CALL_TOOLBAR_ICON_IDLE_CLASS} />
          </CircleToolbarButton>
        );
      case "add":
        return onOpenAddToSpace ? (
          <CircleToolbarButton
            key={id}
            onClick={onOpenAddToSpace}
            ariaLabel={
              isGroupRoom ? "Add people to this space call" : "Add someone to your space"
            }
            caption={isGroupRoom ? "Add people" : "Add"}
          >
            <UserPlus size={18} className={CALL_TOOLBAR_ICON_IDLE_CLASS} />
          </CircleToolbarButton>
        ) : null;
      case "spaceOptions":
        return onOpenSpaceOptions ? (
          <CircleToolbarButton
            key={id}
            onClick={onOpenSpaceOptions}
            ariaLabel="Space options"
            caption="Options"
          >
            <MoreHorizontal size={18} className={CALL_TOOLBAR_ICON_IDLE_CLASS} />
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
            <SkipForward size={18} className={CALL_TOOLBAR_ICON_IDLE_CLASS} />
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
        return onOpenAddToSpace ? (
          <DropdownMenuItem key={id} onClick={onOpenAddToSpace}>
            <UserPlus size={16} />
            {isGroupRoom ? "Add people" : "Add to space"}
          </DropdownMenuItem>
        ) : null;
      case "spaceOptions":
        return onOpenSpaceOptions ? (
          <DropdownMenuItem key={id} onClick={onOpenSpaceOptions}>
            <MoreHorizontal size={16} />
            Space options
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
        iconOn={<Mic size={18} className={CALL_TOOLBAR_ICON_ON_CLASS} />}
        iconOff={<MicOff size={18} className={CALL_TOOLBAR_ICON_OFF_CLASS} />}
      />

      <MediaControlButton
        active={cameraEnabled}
        onClick={onToggleCamera}
        disabled={!mediaTogglesReady}
        ariaLabel={cameraEnabled ? "Turn camera off" : "Turn camera on"}
        caption={cameraEnabled ? "Video" : "Camera"}
        iconOn={<Video size={18} className={CALL_TOOLBAR_ICON_ON_CLASS} />}
        iconOff={<VideoOff size={18} className={CALL_TOOLBAR_ICON_OFF_CLASS} />}
      />

      {showScreenShareAction ? (
        <MediaControlButton
          active={screenSharing}
          onClick={() => onToggleScreenShare?.()}
          disabled={!mediaTogglesReady}
          ariaLabel={screenSharing ? "Stop sharing screen" : "Share screen"}
          caption={screenSharing ? "Sharing" : "Share"}
          iconOn={<Monitor size={18} className={CALL_TOOLBAR_ICON_ON_CLASS} />}
          iconOff={<MonitorOff size={18} className={CALL_TOOLBAR_ICON_OFF_CLASS} />}
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
            className={rightPanelTab === "participants" ? CALL_TOOLBAR_ICON_ACTIVE_CLASS : CALL_TOOLBAR_ICON_IDLE_CLASS}
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
            className={rightPanelTab === "activities" ? CALL_TOOLBAR_ICON_ACTIVE_CLASS : CALL_TOOLBAR_ICON_IDLE_CLASS}
          />
        </CircleToolbarButton>
      ) : null}

      {showWideDivider ? (
        <div className={CALL_TOOLBAR_DIVIDER_CLASS} aria-hidden />
      ) : null}
    </>
  );

  const narrowScrollStripClass = cn(
    "flex min-w-0 flex-1 items-center gap-1 overflow-x-auto overflow-y-visible overscroll-x-contain",
    HIDE_SCROLLBAR_CLASS,
  );

  return (
    <>
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
              <LeaveCallEndControl
                onEnd={onEnd}
                hostEndForEveryoneEnabled={hostEndForEveryoneEnabled}
                onOpenHostEndForEveryone={openHostEndForEveryoneDialog}
                compact
                isGroupRoom={isGroupRoom}
              />
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
                        className={CALL_TOOLBAR_MORE_BUTTON_CLASS}
                      >
                        <MoreVertical size={18} className={CALL_TOOLBAR_ICON_IDLE_CLASS} />
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

            <div ref={endRef} className="flex shrink-0 items-center">
              <LeaveCallEndControl
                onEnd={onEnd}
                hostEndForEveryoneEnabled={hostEndForEveryoneEnabled}
                onOpenHostEndForEveryone={openHostEndForEveryoneDialog}
                compact={false}
                isGroupRoom={isGroupRoom}
              />
            </div>
          </>
        )}
      </div>
      </div>

      <AlertDialog open={hostEndForEveryoneDialogOpen} onOpenChange={setHostEndForEveryoneDialogOpen}>
        <AlertDialogContent className={CALL_ROOM_FORCED_DARK_CLASS}>
          <AlertDialogHeader>
            <AlertDialogTitle>{sessionExitCopy.hostEndAlertTitle}</AlertDialogTitle>
            <AlertDialogDescription>{sessionExitCopy.hostEndAlertDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              className={buttonVariants({ variant: "destructive" })}
              onClick={() => void onHostEndSpaceForEveryone?.()}
            >
              {sessionExitCopy.hostEndAlertConfirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
