"use client";

import type { MouseEvent } from "react";
import { Loader2, MessageSquare, Phone, Video } from "lucide-react";

import type { ConnectionCallMode } from "@/features/connection-call/types/connection-call.types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { ProfileRecentMatch } from "../types/profile-insights.types";

type RecentMatchCallActionsProps = {
  match: ProfileRecentMatch;
  disabled?: boolean;
  isCalling?: boolean;
  isMessaging?: boolean;
  onCall: (match: ProfileRecentMatch, mode: ConnectionCallMode) => void;
  onMessage?: (match: ProfileRecentMatch) => void;
  className?: string;
  /** Compact icon-only buttons for dialog rows. */
  variant?: "icons" | "labeled";
};

export function RecentMatchCallActions({
  match,
  disabled = false,
  isCalling = false,
  isMessaging = false,
  onCall,
  onMessage,
  className,
  variant = "icons",
}: RecentMatchCallActionsProps) {
  const isBusy = isCalling || isMessaging;
  const canInteract = match.isConnected && !disabled && !isBusy;
  const blockedTitle = match.isConnected
    ? undefined
    : onMessage
      ? "Connect first to message or call"
      : "Connect first to call";

  const startCall = (event: MouseEvent, mode: ConnectionCallMode) => {
    event.preventDefault();
    event.stopPropagation();
    if (!canInteract) return;
    onCall(match, mode);
  };

  const startMessage = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!canInteract || !onMessage) return;
    onMessage(match);
  };

  const messageButton =
    onMessage != null ? (
      <Button
        type="button"
        variant="outline"
        size={variant === "labeled" ? "sm" : "icon"}
        disabled={!canInteract}
        onClick={startMessage}
        className={
          variant === "labeled"
            ? "h-8 cursor-pointer gap-1 rounded-lg px-2.5 text-[12px] font-medium disabled:cursor-not-allowed"
            : "h-8 w-8 cursor-pointer rounded-lg disabled:cursor-not-allowed"
        }
        aria-label={variant === "icons" ? "Message" : undefined}
        title={blockedTitle ?? "Message"}
      >
        {isMessaging ? (
          <Loader2
            className={cn("animate-spin", variant === "labeled" ? "h-3.5 w-3.5 shrink-0" : "h-3.5 w-3.5")}
          />
        ) : (
          <MessageSquare
            className={cn(variant === "labeled" ? "h-3.5 w-3.5 shrink-0" : "h-3.5 w-3.5")}
            strokeWidth={2.25}
          />
        )}
        {variant === "labeled" ? "Message" : null}
      </Button>
    ) : null;

  if (variant === "labeled") {
    return (
      <div className={cn("flex shrink-0 flex-wrap items-center justify-end gap-1.5", className)}>
        {messageButton}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canInteract}
          onClick={(event) => startCall(event, "audio")}
          className="h-8 cursor-pointer gap-1 rounded-lg px-2.5 text-[12px] font-medium disabled:cursor-not-allowed"
          title={blockedTitle ?? "Audio call"}
        >
          {isCalling ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
          ) : (
            <Phone className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
          )}
          Call
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canInteract}
          onClick={(event) => startCall(event, "video")}
          className="h-8 cursor-pointer gap-1 rounded-lg px-2.5 text-[12px] font-medium disabled:cursor-not-allowed"
          title={blockedTitle ?? "Video call"}
        >
          {isCalling ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
          ) : (
            <Video className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
          )}
          Video
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex shrink-0 items-center gap-1", className)}>
      {messageButton}
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={!canInteract}
        onClick={(event) => startCall(event, "audio")}
        className="h-8 w-8 cursor-pointer rounded-lg disabled:cursor-not-allowed"
        aria-label="Audio call"
        title={blockedTitle ?? "Audio call"}
      >
        {isCalling ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Phone className="h-3.5 w-3.5" strokeWidth={2.25} />
        )}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={!canInteract}
        onClick={(event) => startCall(event, "video")}
        className="h-8 w-8 cursor-pointer rounded-lg disabled:cursor-not-allowed"
        aria-label="Video call"
        title={blockedTitle ?? "Video call"}
      >
        {isCalling ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Video className="h-3.5 w-3.5" strokeWidth={2.25} />
        )}
      </Button>
    </div>
  );
}
