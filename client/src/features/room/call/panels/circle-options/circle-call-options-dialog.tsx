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
import { RoomCircleCallOptionActions } from "@/features/room/call/panels/circle-options/circle-call-option-actions";
import { getRtkMutationErrorMessage } from "@/lib/api/rtk-mutation-error";
import { cn } from "@/lib/utils";

/** Stack above `InCallContainer` (z-100). */
const DIALOG_OVERLAY_Z = "z-240";
const DIALOG_CONTENT_Z = "z-250";

export type RoomCircleCallOptionsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  displayTitle: string;
  canEdit: boolean;
  showInvite: boolean;
  onInvite?: () => void;
  showChat: boolean;
  onOpenChat?: () => void;
};

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
}: RoomCircleCallOptionsDialogProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayTitle);
  const [updateTitle, { isLoading }] = useUpdateRoomTitleMutation();

  useEffect(() => {
    if (open) return;
    queueMicrotask(() => setEditing(false));
  }, [open]);

  useEffect(() => {
    if (editing) return;
    queueMicrotask(() => setDraft(displayTitle));
  }, [displayTitle, editing]);

  const cancelEdit = () => {
    setDraft(displayTitle);
    setEditing(false);
  };

  const saveTitle = async () => {
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

  const closeThen = (fn?: () => void) => {
    onOpenChange(false);
    fn?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(DIALOG_CONTENT_Z, "gap-0 overflow-hidden p-0 sm:max-w-md")}
        overlayClassName={DIALOG_OVERLAY_Z}
      >
        <DialogHeader className="space-y-1 border-b px-4 py-4 text-left">
          <DialogTitle>Circle options</DialogTitle>
          <DialogDescription>
            Rename the circle, share the join link, or jump to chat.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[min(70dvh,520px)] overflow-y-auto px-4 py-4">
          <CircleNameSection
            displayTitle={displayTitle}
            draft={draft}
            setDraft={setDraft}
            editing={editing}
            setEditing={setEditing}
            canEdit={canEdit}
            isLoading={isLoading}
            onSave={() => void saveTitle()}
            onCancelEdit={cancelEdit}
          />

          <Separator className="my-4" />

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

type CircleNameSectionProps = {
  displayTitle: string;
  draft: string;
  setDraft: (v: string) => void;
  editing: boolean;
  setEditing: (v: boolean) => void;
  canEdit: boolean;
  isLoading: boolean;
  onSave: () => void;
  onCancelEdit: () => void;
};

function CircleNameSection({
  displayTitle,
  draft,
  setDraft,
  editing,
  setEditing,
  canEdit,
  isLoading,
  onSave,
  onCancelEdit,
}: CircleNameSectionProps) {
  return (
    <section className="space-y-3" aria-label="Circle name">
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
                if (e.key === "Enter") onSave();
                if (e.key === "Escape") onCancelEdit();
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={onSave} disabled={isLoading}>
                <Check className="mr-1.5 size-3.5" aria-hidden />
                Save
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={onCancelEdit} disabled={isLoading}>
                <X className="mr-1.5 size-3.5" aria-hidden />
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
                <Pencil className="mr-1.5 size-3.5" aria-hidden />
                Edit
              </Button>
            ) : null}
          </div>
        )}

        {!canEdit && !editing ? (
          <p className="mt-1.5 text-xs text-muted-foreground">Only the host can rename this circle.</p>
        ) : null}
      </div>
    </section>
  );
}
