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
import { ProfilePeerAvatar } from "@/lib/ui/profile-peer-avatar";

type WithdrawRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  peer: {
    name: string;
    image: string | null;
    username?: string | null;
  };
};

export function WithdrawRequestDialog({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
  peer,
}: WithdrawRequestDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Withdraw request?</DialogTitle>
          <DialogDescription>
            This will cancel your pending connection request.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2">
          <ProfilePeerAvatar
            image={peer.image}
            label={peer.name}
            seed={peer.username ?? peer.name}
            className="h-10 w-10 shrink-0 rounded-full"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{peer.name}</p>
            {peer.username ? (
              <p className="truncate text-xs text-muted-foreground">@{peer.username}</p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Keep request
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Withdrawing..." : "Withdraw"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
