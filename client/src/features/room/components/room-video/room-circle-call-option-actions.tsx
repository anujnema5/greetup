"use client";

import { Link2, MessageCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BTN_ROW = "h-9 w-full justify-start gap-2 sm:w-auto sm:justify-center";

export type RoomCircleCallOptionActionsProps = {
  roomId: string;
  showInvite: boolean;
  onInvite?: () => void;
  showChat: boolean;
  onOpenChat?: () => void;
};

/** Invite / copy join link / open chat — used inside `RoomCircleCallOptionsDialog`. */
export function RoomCircleCallOptionActions({
  roomId,
  showInvite,
  onInvite,
  showChat,
  onOpenChat,
}: RoomCircleCallOptionActionsProps) {
  const copyJoinLink = () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/circle/${encodeURIComponent(roomId)}`;
    void navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Circle link copied"))
      .catch(() => toast.error("Could not copy link"));
  };

  return (
    <section className="flex flex-col gap-2" aria-label="Circle actions">
      <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        In this circle
      </h3>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {showInvite && onInvite ? (
          <Button type="button" size="sm" variant="outline" className={cn(BTN_ROW)} onClick={onInvite}>
            <UserPlus className="size-3.5 shrink-0" aria-hidden />
            Invite people
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="outline" className={cn(BTN_ROW)} onClick={copyJoinLink}>
          <Link2 className="size-3.5 shrink-0" aria-hidden />
          Copy link
        </Button>
        {showChat && onOpenChat ? (
          <Button type="button" size="sm" variant="outline" className={cn(BTN_ROW)} onClick={onOpenChat}>
            <MessageCircle className="size-3.5 shrink-0" aria-hidden />
            Open chat
          </Button>
        ) : null}
      </div>
    </section>
  );
}
