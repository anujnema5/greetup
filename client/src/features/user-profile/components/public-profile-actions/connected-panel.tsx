"use client";

import { Check, Loader2, MessageCircle, Phone, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ConnectionCallMode } from "@/features/connection-call/types/connection-call.types";

import { PublicProfileOverflowMenu, type PublicProfileOverflowMenuProps } from "./overflow-menu";
import { PublicProfileStatusBanner } from "./status-banner";

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

function CallButton({
  mode,
  disabled,
  title,
  onClick,
}: {
  mode: ConnectionCallMode;
  disabled: boolean;
  title: string;
  onClick: () => void;
}) {
  const Icon = mode === "audio" ? Phone : Video;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="size-11 shrink-0 rounded-xl"
      disabled={disabled}
      title={title}
      aria-label={title}
      onClick={onClick}
    >
      <Icon className="size-[18px]" strokeWidth={2} aria-hidden />
    </Button>
  );
}

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
    <div className={cn("flex w-full flex-col gap-2.5", className)}>
      <PublicProfileStatusBanner
        tone="emerald"
        icon={<Check className="size-4" aria-hidden />}
        label="Connected"
      />

      <div className="flex gap-2">
        <Button
          type="button"
          className="h-11 min-w-0 flex-1 rounded-xl font-semibold"
          disabled={isOpeningChat}
          onClick={onMessage}
        >
          {isOpeningChat ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <MessageCircle className="size-4" aria-hidden />
          )}
          Message
        </Button>

        <CallButton
          mode="audio"
          disabled={callBlocked}
          title={callHint}
          onClick={() => onCall("audio")}
        />
        <CallButton
          mode="video"
          disabled={callBlocked}
          title={videoHint}
          onClick={() => onCall("video")}
        />

        <PublicProfileOverflowMenu {...overflow} />
      </div>
    </div>
  );
}
