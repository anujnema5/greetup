"use client";

import { useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
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
  MoreVertical,
  PhoneOff,
  Radio,
  SkipForward,
  UserPlus,
  Video,
  VideoOff,
} from "lucide-react";
import {
  CircleToolbarButton,
  MediaControlButton,
} from "@/features/room/components/room-video/room-video-primitives";
import { cn } from "@/lib/utils";

type RightPanelTab = "chat" | "activities";

/** Tailwind `md` — pin Skip outside overflow on smaller viewports */
const NARROW_TOOLBAR_MQ = "(max-width: 767px)";

function subscribeNarrowToolbar(onChange: () => void) {
  const mq = window.matchMedia(NARROW_TOOLBAR_MQ);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getNarrowToolbarSnapshot() {
  return window.matchMedia(NARROW_TOOLBAR_MQ).matches;
}

function getNarrowToolbarServerSnapshot() {
  return false;
}

/** Outer bar: reads on dark stage; safe-area padding for home indicator. */
const TOOLBAR_SHELL_CLASS =
  "pointer-events-auto z-30 w-full shrink-0 select-none rounded-xl border border-white/12 bg-black/78 py-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-6px_28px_-8px_rgb(0_0_0_/0.45)] backdrop-blur-xl";

/** Hide scrollbars on narrow overflow row (Firefox / legacy Edge). */
const HIDE_SCROLLBAR_CLASS =
  "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

/** h-11 w-11 + typical flex gap between toolbar controls */
const EST_ICON_PX = 44;
const EST_GAP_PX = 8;

function maxSecondaryInlineCount(availablePx: number, total: number): number {
  if (total <= 0 || availablePx <= 0) return 0;
  for (let k = total; k >= 0; k--) {
    let used = 0;
    if (k > 0) {
      used = k * EST_ICON_PX + Math.max(0, k - 1) * EST_GAP_PX;
    }
    if (k < total) {
      used += (k > 0 ? EST_GAP_PX : 0) + EST_ICON_PX;
    }
    if (used <= availablePx) return k;
  }
  return 0;
}

/** In-room call control bar (mic/camera, secondaries, hang up). */
export function RoomVideoToolbar({
  onToggleMic,
  onToggleCamera,
  micEnabled,
  cameraEnabled,
  mediaTogglesReady,
  showScreenShare: _showScreenShare,
  screenSharing: _screenSharing,
  onToggleScreenShare: _onToggleScreenShare,
  conversationId,
  rightPanelTab,
  setRightPanelTab,
  isGroupRoom,
  isLive,
  setIsLive,
  showAddToCircle,
  onOpenAddToCircle,
  showSkip,
  onSkip,
  onEnd,
  elapsed: _elapsed,
  formatDuration: _formatDuration,
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
  rightPanelTab: RightPanelTab;
  setRightPanelTab: (tab: RightPanelTab) => void;
  isGroupRoom: boolean;
  isLive: boolean;
  setIsLive: (value: (prev: boolean) => boolean) => void;
  showAddToCircle: boolean;
  onOpenAddToCircle?: () => void;
  showSkip: boolean;
  onSkip: () => void;
  onEnd: () => void;
  elapsed: number;
  formatDuration: (seconds: number) => string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const secondaryActions = useMemo(() => {
    type Id = "chat" | "activities" | "live" | "add" | "skip";
    const items: Id[] = [];
    if (conversationId) items.push("chat");
    if (!isGroupRoom) items.push("activities", "live");
    if (showAddToCircle && onOpenAddToCircle) items.push("add");
    if (showSkip) items.push("skip");
    return items;
  }, [
    conversationId,
    isGroupRoom,
    showAddToCircle,
    onOpenAddToCircle,
    showSkip,
  ]);

  const narrowToolbar = useSyncExternalStore(
    subscribeNarrowToolbar,
    getNarrowToolbarSnapshot,
    getNarrowToolbarServerSnapshot,
  );
  const skipPinnedMobile = showSkip && narrowToolbar;

  const flowSecondaries = useMemo(
    () =>
      secondaryActions.filter((id) => {
        if (skipPinnedMobile && id === "skip") return false;
        /* Direct room on phone: Activities opens from the media row; keep it out of the overflow strip. */
        if (narrowToolbar && !isGroupRoom && id === "activities") return false;
        return true;
      }),
    [secondaryActions, skipPinnedMobile, narrowToolbar, isGroupRoom],
  );

  const [inlineSecondaryCount, setInlineSecondaryCount] = useState(flowSecondaries.length);

  // Fit as many secondary icons inline as width allows; rest go in the “more” menu.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const measure = () => {
      const media = mediaRef.current;
      const end = endRef.current;
      if (!media || !end) return;

      const rw = root.getBoundingClientRect().width;
      const mw = media.getBoundingClientRect().width;
      const ew = end.getBoundingClientRect().width;
      const reservedForPinnedSkip = skipPinnedMobile ? EST_ICON_PX + EST_GAP_PX : 0;
      /** Narrow: [media][actions][end] + gap-1.5. Wide: + divider + gap-2. */
      const gapPx = narrowToolbar ? 6 : 8;
      const flexGaps = narrowToolbar ? 2 : 3;
      const dividerPx = narrowToolbar ? 0 : 1;
      const rowGapsPx = gapPx * flexGaps + dividerPx;
      const available = rw - mw - ew - rowGapsPx - 4 - reservedForPinnedSkip;

      setInlineSecondaryCount(maxSecondaryInlineCount(available, flowSecondaries.length));
    };

    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(root);
    return () => ro.disconnect();
  }, [flowSecondaries.length, skipPinnedMobile, narrowToolbar]);

  if (!onToggleMic || !onToggleCamera) {
    return null;
  }

  const overflowSecondaries = flowSecondaries.slice(inlineSecondaryCount);
  const showOverflowTrigger = overflowSecondaries.length > 0;

  type SecondaryId = (typeof secondaryActions)[number];

  const renderSecondaryButton = (id: SecondaryId) => {
    switch (id) {
      case "chat":
        return (
          <CircleToolbarButton key={id} onClick={() => setRightPanelTab("chat")} ariaLabel="Chat">
            <MessageCircle
              size={18}
              className={rightPanelTab === "chat" ? "text-primary" : "text-white/80"}
            />
          </CircleToolbarButton>
        );
      case "activities":
        return (
          <CircleToolbarButton
            key={id}
            onClick={() => setRightPanelTab("activities")}
            ariaLabel="Activities"
          >
            <LayoutGrid
              size={18}
              className={rightPanelTab === "activities" ? "text-primary" : "text-white/80"}
            />
          </CircleToolbarButton>
        );
      case "live":
        return (
          <CircleToolbarButton
            key={id}
            onClick={() => setIsLive((prev) => !prev)}
            ariaLabel={isLive ? "End Live" : "Go Live"}
            className={isLive ? "bg-red-500/80 hover:bg-red-500" : undefined}
          >
            <Radio size={18} className={isLive ? "text-white" : "text-white/80"} />
          </CircleToolbarButton>
        );
      case "add":
        return onOpenAddToCircle ? (
          <CircleToolbarButton key={id} onClick={onOpenAddToCircle} ariaLabel="Add">
            <UserPlus size={18} className="text-white/80" />
          </CircleToolbarButton>
        ) : null;
      case "skip":
        return (
          <CircleToolbarButton key={id} onClick={onSkip} ariaLabel="Skip">
            <SkipForward size={18} className="text-white/80" />
          </CircleToolbarButton>
        );
      default:
        return null;
    }
  };

  const renderOverflowMenuItem = (id: SecondaryId) => {
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
            Add to circle
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

  return (
    <div ref={rootRef} role="toolbar" aria-label="Call controls" className={TOOLBAR_SHELL_CLASS}>
      <div
        className={cn(
          "flex w-full min-w-0 items-center",
          narrowToolbar
            ? cn(
                "justify-start gap-1.5 overflow-x-auto overflow-y-visible overscroll-x-contain px-2",
                HIDE_SCROLLBAR_CLASS,
              )
            : "justify-start gap-2 px-3 sm:gap-3 sm:px-4",
        )}
      >
        <div
          ref={mediaRef}
          className={cn("flex shrink-0 items-center", narrowToolbar ? "gap-1.5" : "gap-2")}
        >
          <MediaControlButton
            active={micEnabled}
            onClick={onToggleMic}
            disabled={!mediaTogglesReady}
            ariaLabel={micEnabled ? "Mute" : "Unmute"}
            iconOn={<Mic size={18} className="text-white/90" />}
            iconOff={<MicOff size={18} className="text-amber-200/95" />}
          />

          <MediaControlButton
            active={cameraEnabled}
            onClick={onToggleCamera}
            disabled={!mediaTogglesReady}
            ariaLabel={cameraEnabled ? "Stop video" : "Start video"}
            iconOn={<Video size={18} className="text-white/90" />}
            iconOff={<VideoOff size={18} className="text-amber-200/95" />}
          />

          {narrowToolbar && !isGroupRoom ? (
            <CircleToolbarButton
              onClick={() => setRightPanelTab("activities")}
              ariaLabel="Activities"
            >
              <LayoutGrid
                size={18}
                className={rightPanelTab === "activities" ? "text-primary" : "text-white/80"}
              />
            </CircleToolbarButton>
          ) : null}

          {/* Screen share — restore when needed (re-add Monitor, MonitorOff imports). */}

          <div className="hidden h-6 w-px shrink-0 self-center bg-white/20 md:block" aria-hidden />
        </div>

        <div
          className={cn(
            "flex min-h-11 shrink-0 items-center",
            narrowToolbar ? "gap-1.5" : "gap-2",
          )}
        >
          {flowSecondaries.slice(0, inlineSecondaryCount).map((id) => renderSecondaryButton(id))}
          {skipPinnedMobile ? renderSecondaryButton("skip") : null}
          {showOverflowTrigger ? (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="More options"
                  className={cn(
                    "inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/15 p-0",
                    "transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35",
                    "touch-manipulation active:bg-white/20",
                  )}
                  style={{
                    border: "1px solid rgba(255,255,255,0.18)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <MoreVertical size={18} className="text-white/85" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="end"
                sideOffset={8}
                collisionPadding={12}
                className="z-[200] w-52"
              >
                {overflowSecondaries.map((id) => renderOverflowMenuItem(id))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        <div ref={endRef} className="flex shrink-0 items-center gap-2">
          {!narrowToolbar ? (
            <div className="h-6 w-px shrink-0 self-center bg-white/20" aria-hidden />
          ) : null}
          <Button
            type="button"
            variant="destructive"
            size="icon-lg"
            onClick={onEnd}
            aria-label="End call"
            className="h-11 w-11 rounded-full border border-white/10 bg-red-500 backdrop-blur-md transition-colors hover:bg-red-600"
          >
            <PhoneOff size={18} className="text-white" />
          </Button>
        </div>
      </div>
    </div>
  );
}
