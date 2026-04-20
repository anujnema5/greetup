"use client";

import { Button } from "@/components/ui/button";
import { LayoutGrid, MessageCircle, Mic, MicOff, Monitor, MonitorOff, PhoneOff, Radio, SkipForward, UserPlus, Video, VideoOff } from "lucide-react";
import {
  CircleToolbarButton,
  MediaControlButton,
} from "@/features/room/components/room-video/room-video-primitives";

type RightPanelTab = "chat" | "activities";

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
  showSkip,
  onSkip,
  onEnd,
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
}) {
  if (!onToggleMic || !onToggleCamera) {
    return null;
  }

  return (
    <div
      className="pointer-events-auto absolute bottom-4 left-4 z-20 flex items-center gap-2"
      style={{ userSelect: "none" }}
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

      {showScreenShare ? (
        <MediaControlButton
          active={screenSharing}
          onClick={onToggleScreenShare!}
          disabled={!mediaTogglesReady}
          ariaLabel={screenSharing ? "Stop sharing" : "Share screen"}
          iconOn={<Monitor size={18} className="text-white/90" />}
          iconOff={<MonitorOff size={18} className="text-amber-200/95" />}
        />
      ) : null}

      <div className="mx-0.5 h-6 w-px bg-white/20" />

      {conversationId ? (
        <CircleToolbarButton onClick={() => setRightPanelTab("chat")} ariaLabel="Chat">
          <MessageCircle
            size={18}
            className={rightPanelTab === "chat" ? "text-primary" : "text-white/80"}
          />
        </CircleToolbarButton>
      ) : null}

      {!isGroupRoom ? (
        <CircleToolbarButton onClick={() => setRightPanelTab("activities")} ariaLabel="Activities">
          <LayoutGrid
            size={18}
            className={rightPanelTab === "activities" ? "text-primary" : "text-white/80"}
          />
        </CircleToolbarButton>
      ) : null}

      {!isGroupRoom ? (
        <CircleToolbarButton
          onClick={() => setIsLive((prev) => !prev)}
          ariaLabel={isLive ? "End Live" : "Go Live"}
          className={isLive ? "bg-red-500/80 hover:bg-red-500" : undefined}
        >
          <Radio size={18} className={isLive ? "text-white" : "text-white/80"} />
        </CircleToolbarButton>
      ) : null}

      {showAddToCircle && onOpenAddToCircle ? (
        <CircleToolbarButton onClick={onOpenAddToCircle} ariaLabel="Add">
          <UserPlus size={18} className="text-white/80" />
        </CircleToolbarButton>
      ) : null}

      {showSkip ? (
        <CircleToolbarButton onClick={onSkip} ariaLabel="Skip">
          <SkipForward size={18} className="text-white/80" />
        </CircleToolbarButton>
      ) : null}

      <div className="mx-0.5 h-6 w-px bg-white/20" />

      <Button
        type="button"
        variant="destructive"
        size="icon-lg"
        onClick={onEnd}
        aria-label="End call"
        className="h-11 w-11 rounded-full bg-red-500 transition-colors hover:bg-red-600"
        style={{
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(8px)",
        }}
      >
        <PhoneOff size={18} className="text-white" />
      </Button>
    </div>
  );
}
