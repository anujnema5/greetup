"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RoomSpaceCallOptionActions } from "@/features/room/call/panels/space-options/space-call-option-actions";
import { CALL_ROOM_FORCED_DARK_CLASS } from "@/features/room/constants/call/call-chrome-theme";
import {
  IN_CALL_DIALOG_CONTENT_Z,
  IN_CALL_DIALOG_OVERLAY_Z,
} from "@/features/room/constants/call/in-call-dialog-layer";
import { Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  COMPACT_DIALOG_DESCRIPTION,
  COMPACT_DIALOG_ICON_WRAP,
  COMPACT_DIALOG_TITLE,
} from "@/lib/ui/compact-dialog-typography";

export type RoomSpaceCallOptionsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  showInvite: boolean;
  onInvite?: () => void;
  showChat: boolean;
  onOpenChat?: () => void;
};

export function RoomSpaceCallOptionsDialog({
  open,
  onOpenChange,
  roomId,
  showInvite,
  onInvite,
  showChat,
  onOpenChat,
}: RoomSpaceCallOptionsDialogProps) {
  const closeThen = (fn?: () => void) => {
    onOpenChange(false);
    fn?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(CALL_ROOM_FORCED_DARK_CLASS, IN_CALL_DIALOG_CONTENT_Z, "gap-0 overflow-hidden p-0 sm:max-w-md")}
        overlayClassName={IN_CALL_DIALOG_OVERLAY_Z}
      >
        <DialogHeader className="space-y-1 border-b px-4 py-4 text-left">
          <DialogTitle>Circle options</DialogTitle>
          <DialogDescription>Invite people, copy the join link, or open chat.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[min(70dvh,520px)] overflow-y-auto px-4 py-4">
          <RoomSpaceCallOptionActions
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
