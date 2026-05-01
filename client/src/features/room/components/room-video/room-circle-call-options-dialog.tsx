"use client";

import { useEffect, useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useUpdateRoomTitleMutation } from "@/features/room/api/room-api";
import { RoomCircleCallHeaderActions } from "@/features/room/components/room-video/room-circle-call-header-actions";
import { getRtkMutationErrorMessage } from "@/lib/api/rtk-mutation-error";

export function RoomCircleCallOptionsDialog({
  open,
  onOpenChange,
  roomId,
  displayTitle,
  canEdit,
  showInvite,
  onInvite,
  showChat,
  onOpenChat,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  displayTitle: string;
  canEdit: boolean;
  showInvite: boolean;
  onInvite?: () => void;
  showChat: boolean;
  onOpenChat?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayTitle);
  const [updateTitle, { isLoading }] = useUpdateRoomTitleMutation();

  useEffect(() => {
    if (!editing) setDraft(displayTitle);
  }, [displayTitle, editing]);

  useEffect(() => {
    if (!open) {
      setEditing(false);
      setDraft(displayTitle);
    }
  }, [open, displayTitle]);

  const cancelEdit = () => {
    setDraft(displayTitle);
    setEditing(false);
  };

  const save = async () => {
    const next = draft.trim();
    if (!next) {
      toast.error("Enter a name for this circle.");
      return;
    }
    if (next === displayTitle.trim()) {
      setEditing(false);
      return;
    }
    try {
      await updateTitle({ roomId, title: next }).unwrap();
      toast.success("Circle name saved");
      setEditing(false);
    } catch (e: unknown) {
      toast.error(getRtkMutationErrorMessage(e, "Could not save name"));
    }
  };

  const handleInvite = () => {
    onOpenChange(false);
    onInvite?.();
  };

  const handleOpenChat = () => {
    onOpenChange(false);
    onOpenChat?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="z-250 gap-0 overflow-hidden p-0 sm:max-w-md"
        overlayClassName="z-240"
      >
        <DialogHeader className="space-y-1 border-b px-4 py-4 text-left">
          <DialogTitle>Circle options</DialogTitle>
          <DialogDescription>Name, invite link, and quick actions for this call.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[min(70dvh,520px)] overflow-y-auto px-4 py-4">
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Circle name</p>
              {editing ? (
                <div className="flex flex-col gap-2">
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    maxLength={160}
                    placeholder="Name this circle"
                    disabled={isLoading || !canEdit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void save();
                      if (e.key === "Escape") cancelEdit();
                    }}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" onClick={() => void save()} disabled={isLoading}>
                      <Check className="mr-1.5 size-3.5" />
                      Save
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={cancelEdit} disabled={isLoading}>
                      <X className="mr-1.5 size-3.5" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2.5">
                  <p className="min-w-0 flex-1 wrap-break-word text-sm font-medium">{displayTitle}</p>
                  {canEdit ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => {
                        setDraft(displayTitle);
                        setEditing(true);
                      }}
                    >
                      <Pencil className="mr-1.5 size-3.5" />
                      Edit
                    </Button>
                  ) : null}
                </div>
              )}
              {!canEdit && !editing ? (
                <p className="mt-1.5 text-xs text-muted-foreground">Only the host can rename this circle.</p>
              ) : null}
            </div>
          </div>

          <Separator className="my-4" />

          <RoomCircleCallHeaderActions
            roomId={roomId}
            showInvite={showInvite}
            onInvite={handleInvite}
            showChat={showChat}
            onOpenChat={handleOpenChat}
            variant="dialog"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
