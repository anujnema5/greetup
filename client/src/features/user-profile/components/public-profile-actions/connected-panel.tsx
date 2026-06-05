"use client";

import { Loader2, MessageCircle, Phone, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ConnectionCallMode } from "@/features/connection-call/types/connection-call.types";

import { PublicProfileOverflowMenu, type PublicProfileOverflowMenuProps } from "./overflow-menu";

type PublicProfileConnectedPanelProps = {
  onMessage: () => void;
  onCall: (mode: ConnectionCallMode) => void;
  canCall: boolean;
  callDisabledReason: string | null;
  callStatusLoading: boolean;
  isOpeningChat: boolean;
  isStartingCall: boolean;
  overflow: PublicProfileOverflowMenuProps;
  className?: string;
};

const actionButtonClassName =
  "h-10 min-w-0 flex-1 rounded-xl gap-1 px-2 text-xs font-medium";

export function PublicProfileConnectedPanel({
  onMessage,
  onCall,
  canCall,
  callDisabledReason,
  callStatusLoading,
  isOpeningChat,
  isStartingCall,
  overflow,
  className,
}: PublicProfileConnectedPanelProps) {
  const callBlocked = !canCall || isStartingCall || isOpeningChat || callStatusLoading;
  const callHint = canCall ? "Audio call" : (callDisabledReason ?? "Call unavailable");
  const videoHint = canCall ? "Video call" : (callDisabledReason ?? "Call unavailable");

  return (
    <div className={cn("flex gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        className={cn(
          actionButtonClassName,
          "border-primary/35 bg-primary/8 text-primary hover:bg-primary/15 hover:text-primary",
        )}
        disabled={isOpeningChat}
        onClick={onMessage}
      >
        {isOpeningChat ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
        ) : (
          <MessageCircle className="size-3.5 shrink-0" aria-hidden />
        )}
        {isOpeningChat ? "Opening…" : "Message"}
      </Button>
      <Button
        type="button"
        variant="outline"
        className={actionButtonClassName}
        disabled={callBlocked}
        onClick={() => onCall("audio")}
        title={callHint}
      >
        <Phone className="size-3.5 shrink-0" aria-hidden />
        Call
      </Button>
      <Button
        type="button"
        variant="outline"
        className={actionButtonClassName}
        disabled={callBlocked}
        onClick={() => onCall("video")}
        title={videoHint}
      >
        <Video className="size-3.5 shrink-0" aria-hidden />
        Video
      </Button>
      <PublicProfileOverflowMenu {...overflow} tone="row" />
    </div>
  );
}
