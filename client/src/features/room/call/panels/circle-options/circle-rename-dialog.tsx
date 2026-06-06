"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useUpdateRoomTitle } from "@/features/room/api/room.mutations";
import { getApiErrorMessage } from "@/lib/api/fetch-client";
import {
  IN_CALL_DIALOG_CONTENT_Z,
  IN_CALL_DIALOG_OVERLAY_Z,
} from "@/features/room/constants/call/in-call-dialog-layer";
import { cn } from "@/lib/utils";
import {
  COMPACT_DIALOG_DESCRIPTION,
  COMPACT_DIALOG_ICON_WRAP,
  COMPACT_DIALOG_TITLE,
} from "@/lib/ui/compact-dialog-typography";

export type CircleRenameDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  displayTitle: string;
};

export function CircleRenameDialog({
  open,
  onOpenChange,
  roomId,
  displayTitle,
}: CircleRenameDialogProps) {
  const [draft, setDraft] = useState(displayTitle);
  const { mutateAsync: updateTitle, isPending: isLoading } = useUpdateRoomTitle();

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => setDraft(displayTitle));
  }, [open, displayTitle]);

  const handleOpenChange = (next: boolean) => {
    if (!next) setDraft(displayTitle);
    onOpenChange(next);
  };

  const saveTitle = async (e: FormEvent) => {
    e.preventDefault();
    const next = draft.trim();
    if (!next) {
      toast.error("Enter a name for this circle.");
      return;
    }
    if (next === displayTitle.trim()) {
      handleOpenChange(false);
      return;
    }
    try {
      await updateTitle({ roomId, title: next });
      toast.success("Circle name saved");
      handleOpenChange(false);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Could not save name"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(IN_CALL_DIALOG_CONTENT_Z, "sm:max-w-100")}
        overlayClassName={IN_CALL_DIALOG_OVERLAY_Z}
        showCloseButton
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-muted-foreground">
            <Users className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <DialogTitle className="text-[13px] font-semibold leading-none text-foreground">
              Rename circle
            </DialogTitle>
            <DialogDescription className="mt-1 text-[12px] leading-snug">
              Everyone in this call will see the updated name.
            </DialogDescription>
          </div>
        </div>

        <form onSubmit={(e) => void saveTitle(e)} className="space-y-4">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={160}
            placeholder="Name this circle"
            disabled={isLoading}
            autoFocus
            aria-label="Circle name"
            onKeyDown={(e) => {
              if (e.key === "Escape") handleOpenChange(false);
            }}
          />

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-3"
              disabled={isLoading}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-2" disabled={isLoading}>
              {isLoading ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                  Saving…
                </span>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
