"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RoomCircleCallOptionActions } from "@/features/room/call/panels/circle-options/circle-call-option-actions";
import {
  IN_CALL_DIALOG_CONTENT_Z,
  IN_CALL_DIALOG_OVERLAY_Z,
} from "@/features/room/constants/call/in-call-dialog-layer";
import { cn } from "@/lib/utils";

export type RoomCircleCallOptionsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  showInvite: boolean;
  onInvite?: () => void;
  showChat: boolean;
  onOpenChat?: () => void;
};

export function RoomCircleCallOptionsDialog({
  open,
  onOpenChange,
  roomId,
  showInvite,
  onInvite,
  showChat,
  onOpenChat,
}: RoomCircleCallOptionsDialogProps) {
  const closeThen = (fn?: () => void) => {
    onOpenChange(false);
    fn?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(IN_CALL_DIALOG_CONTENT_Z, "gap-0 overflow-hidden p-0 sm:max-w-md")}
        overlayClassName={IN_CALL_DIALOG_OVERLAY_Z}
      >
        <DialogHeader className="space-y-1 border-b px-4 py-4 text-left">
          <DialogTitle>Circle options</DialogTitle>
          <DialogDescription>Invite people, copy the join link, or open chat.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[min(70dvh,520px)] overflow-y-auto px-4 py-4">
          <RoomCircleCallOptionActions
            roomId={roomId}
            showInvite={showInvite}
            onInvite={() => closeThen(onInvite)}
            showChat={showChat}
            onOpenChat={() => closeThen(onOpenChat)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
