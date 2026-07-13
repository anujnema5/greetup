"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type DeleteChatDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  title: string;
  isCircle?: boolean;
};

export function DeleteChatDialog({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
  title,
  isCircle = false,
}: DeleteChatDialogProps) {
  const actionLabel = isCircle ? "Leave chat" : "Delete chat";

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{actionLabel}?</DialogTitle>
          <DialogDescription>
            {isCircle ? (
              <>
                Leave <span className="font-medium text-foreground">{title}</span>? It&apos;ll be
                removed from your inbox.
              </>
            ) : (
              <>
                Remove your chat with{" "}
                <span className="font-medium text-foreground">{title}</span> from your inbox? They
                won&apos;t be affected. A new message will bring it back.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Removing…" : actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
