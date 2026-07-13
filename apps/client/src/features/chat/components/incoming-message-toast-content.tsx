"use client";

import { X } from "lucide-react";
import { toast } from "sonner";

import { profileAvatarGradientClass } from "@/features/profile/lib/profile-insights-display";
import { getProfileImageUrl } from "@/lib/ui/profile-image";
import { cn } from "@/lib/utils";
import { nameInitials } from "@/lib/utils/name-initials";

import { messageSenderLabel, messageToastPreview } from "../lib/message-toast-preview";
import type { Message } from "../types/chat.types";

type IncomingMessageToastContentProps = {
  message: Message;
  toastId: string | number;
  onOpen: () => void;
};

export function IncomingMessageToastContent({
  message,
  toastId,
  onOpen,
}: IncomingMessageToastContentProps) {
  const senderName = messageSenderLabel(message.sender);
  const preview = messageToastPreview(message);
  const senderSeed = message.sender?.id ?? message.senderId;
  const avatarSrc = message.sender?.image
    ? getProfileImageUrl(message.sender.image)
    : null;

  const dismiss = (event: React.SyntheticEvent) => {
    event.stopPropagation();
    toast.dismiss(toastId);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-auto w-[min(calc(100vw-2rem),20rem)] overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-md"
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full cursor-pointer items-center gap-3 p-3 pr-2 text-left transition-colors hover:bg-muted/40"
      >
        {avatarSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarSrc}
            alt=""
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br text-xs font-semibold text-white",
              profileAvatarGradientClass(senderSeed),
            )}
          >
            {nameInitials(senderName)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{senderName}</p>
          <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">
            {preview}
          </p>
        </div>

        <span
          role="button"
          tabIndex={0}
          aria-label="Dismiss"
          onClick={dismiss}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              dismiss(event);
            }
          }}
          className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </span>
      </button>
    </div>
  );
}
