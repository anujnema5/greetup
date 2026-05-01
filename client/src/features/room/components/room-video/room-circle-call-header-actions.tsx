"use client";

import { Link2, MessageCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RoomCircleCallHeaderActions({
  roomId,
  showInvite,
  onInvite,
  showChat,
  onOpenChat,
  variant = "dialog",
}: {
  roomId: string;
  showInvite: boolean;
  onInvite?: () => void;
  showChat: boolean;
  onOpenChat?: () => void;
  /** `dialog` = light surface; `stage` = dark glass (legacy). */
  variant?: "dialog" | "stage";
}) {
  const copyLink = () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/circle/${encodeURIComponent(roomId)}`;
    void navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Circle link copied"))
      .catch(() => toast.error("Could not copy link"));
  };

  const isStage = variant === "stage";
  const actionBtnClass = isStage
    ? "h-8 border border-white/15 bg-white/10 text-xs text-white hover:bg-white/20 sm:h-9 sm:text-sm"
    : "h-9 justify-start gap-2 sm:justify-center";

  return (
    <div className="flex flex-col gap-2">
      <p
        className={cn(
          "text-[10px] font-semibold uppercase tracking-[0.12em]",
          isStage ? "text-white/45" : "text-muted-foreground",
        )}
      >
        In this circle
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {showInvite && onInvite ? (
          <Button
            type="button"
            size="sm"
            variant={isStage ? "secondary" : "outline"}
            className={cn(actionBtnClass, !isStage && "w-full sm:w-auto")}
            onClick={onInvite}
          >
            <UserPlus className="size-3.5 shrink-0" />
            Invite people
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant={isStage ? "secondary" : "outline"}
          className={cn(actionBtnClass, !isStage && "w-full sm:w-auto")}
          onClick={copyLink}
        >
          <Link2 className="size-3.5 shrink-0" />
          Copy link
        </Button>
        {showChat && onOpenChat ? (
          <Button
            type="button"
            size="sm"
            variant={isStage ? "secondary" : "outline"}
            className={cn(actionBtnClass, !isStage && "w-full sm:w-auto")}
            onClick={onOpenChat}
          >
            <MessageCircle className="size-3.5 shrink-0" />
            Open chat
          </Button>
        ) : null}
      </div>
    </div>
  );
}
