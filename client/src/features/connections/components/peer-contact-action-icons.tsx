"use client";

import type { MouseEvent } from "react";
import { Loader2, MessageSquare, Phone, Video } from "lucide-react";

import type { ConnectionCallMode } from "@/features/connection-call/types/connection-call.types";
import { cn } from "@/lib/utils";

type PeerContactActionIconsProps = {
  /** Disables all actions (message, call, video). */
  disabled?: boolean;
  /** Disables audio/video only; message stays available. */
  callsDisabled?: boolean;
  isCalling?: boolean;
  isMessaging?: boolean;
  onMessage: () => void;
  onCall: (mode: ConnectionCallMode) => void;
  className?: string;
  /** Slightly larger tap targets for profile cards. */
  size?: "sm" | "md";
};

const iconButtonClass =
  "inline-flex shrink-0 items-center justify-center rounded-lg text-muted-foreground/75 transition-colors hover:bg-muted/80 hover:text-primary disabled:pointer-events-none disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed";

export function PeerContactActionIcons({
  disabled = false,
  callsDisabled = false,
  isCalling = false,
  isMessaging = false,
  onMessage,
  onCall,
  className,
  size = "sm",
}: PeerContactActionIconsProps) {
  const isBusy = isCalling || isMessaging;
  const canMessage = !disabled && !isBusy;
  const canCall = !disabled && !callsDisabled && !isBusy;
  const callsBlockedTitle = callsDisabled ? "Connect first to call" : undefined;
  const buttonSize = size === "md" ? "h-7 w-7" : "h-6 w-6";
  const iconSize = size === "md" ? "h-3.5 w-3.5" : "h-3 w-3";

  const guard = (event: MouseEvent, allowed: boolean, action: () => void) => {
    event.preventDefault();
    event.stopPropagation();
    if (!allowed) return;
    action();
  };

  return (
    <div className={cn("flex shrink-0 items-center gap-0.5", className)} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        disabled={!canMessage}
        onClick={(event) => guard(event, canMessage, onMessage)}
        className={cn(iconButtonClass, buttonSize)}
        aria-label="Message"
        title="Message"
      >
        {isMessaging ? (
          <Loader2 className={cn(iconSize, "animate-spin text-primary/80")} />
        ) : (
          <MessageSquare className={iconSize} strokeWidth={2} />
        )}
      </button>
      <button
        type="button"
        disabled={!canCall}
        onClick={(event) => guard(event, canCall, () => onCall("audio"))}
        className={cn(iconButtonClass, buttonSize)}
        aria-label="Audio call"
        title={callsBlockedTitle ?? "Call"}
      >
        {isCalling ? (
          <Loader2 className={cn(iconSize, "animate-spin text-primary/80")} />
        ) : (
          <Phone className={iconSize} strokeWidth={2} />
        )}
      </button>
      <button
        type="button"
        disabled={!canCall}
        onClick={(event) => guard(event, canCall, () => onCall("video"))}
        className={cn(iconButtonClass, buttonSize)}
        aria-label="Video call"
        title={callsBlockedTitle ?? "Video"}
      >
        {isCalling ? (
          <Loader2 className={cn(iconSize, "animate-spin text-primary/80")} />
        ) : (
          <Video className={iconSize} strokeWidth={2} />
        )}
      </button>
    </div>
  );
}
