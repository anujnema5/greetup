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
import { getProfileImageUrl } from "@/lib/ui/profile-image";

export type UnblockUserDialogPeer = {
  name: string;
  image: string | null;
  username?: string | null;
};

type UnblockUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  peer: UnblockUserDialogPeer;
};

export function UnblockUserDialog({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
  peer,
}: UnblockUserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Unblock {peer.name}?</DialogTitle>
          <DialogDescription>
            They&apos;ll be able to view your profile, match with you, and send connection requests
            again. You&apos;ll need to reconnect before you can message each other.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={getProfileImageUrl(peer.image)} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{peer.name}</p>
            {peer.username ? (
              <p className="truncate text-xs text-muted-foreground">@{peer.username}</p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Unblocking…" : "Unblock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
