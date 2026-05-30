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

export type BlockUserDialogPeer = {
  name: string;
  image: string | null;
  username?: string | null;
};

type BlockUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  peer: BlockUserDialogPeer;
};

export function BlockUserDialog({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
  peer,
}: BlockUserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Block {peer.name}?</DialogTitle>
          <DialogDescription>
            They won&apos;t be able to view your profile, message you, or send connection requests.
            Any existing connection will be removed.
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
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Blocking…" : "Block"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
