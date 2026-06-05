"use client";

import Link from "next/link";
import { Loader2, ShieldBan, UserX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { getProfileImageUrl } from "@/lib/ui/profile-image";
import { getApiErrorMessage } from "@/lib/api/fetch-client";

import { useUnblockUser } from "../api/blocks.mutations";
import { useListBlockedUsers } from "../api/blocks.queries";
import type { BlockedUserListItem } from "../types/blocks-api.types";
import { UnblockUserDialog } from "./unblock-user-dialog";

function blockedUserLabel(item: BlockedUserListItem): string {
  return item.displayName?.trim() || item.name;
}

function blockedCountMeta(count: number): string {
  if (count === 0) return "Your block list is empty.";
  if (count === 1) return "1 person on your block list.";
  return `${count} people on your block list.`;
}

function BlockedUserRow({
  item,
  onUnblockRequest,
}: {
  item: BlockedUserListItem;
  onUnblockRequest: (item: BlockedUserListItem) => void;
}) {
  const label = blockedUserLabel(item);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted/30">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getProfileImageUrl(item.image)}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{label}</p>
        <p className="truncate text-xs text-muted-foreground">@{item.username}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 rounded-xl"
        onClick={() => onUnblockRequest(item)}
      >
        Unblock
      </Button>
    </div>
  );
}

type BlockedUsersDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function BlockedUsersDialog({ open, onOpenChange }: BlockedUsersDialogProps) {
  const [pendingUnblock, setPendingUnblock] = useState<BlockedUserListItem | null>(null);
  const { mutateAsync: unblockUser, isPending: isUnblocking } = useUnblockUser();

  const { data, isLoading, isError, error, refetch, isFetching } = useListBlockedUsers({
    enabled: open,
  });
  const items = data?.items ?? [];
  const showLoading = isLoading || (isFetching && items.length === 0);
  const count = items.length;

  const handleConfirmUnblock = () => {
    if (!pendingUnblock) return;
    const label = blockedUserLabel(pendingUnblock);

    void unblockUser({
      targetUserId: pendingUnblock.userId,
      peerUsername: pendingUnblock.username,
    })
      .then(() => {
        toast.success(`${label} unblocked`);
        setPendingUnblock(null);
      })
      .catch((err: unknown) => {
        toast.error(getApiErrorMessage(err, "Could not unblock user"));
      });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-100" showCloseButton>
          <div className="flex items-start gap-3 pr-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-muted-foreground">
              <ShieldBan className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <DialogTitle className="text-[13px] font-semibold leading-none text-foreground">
                Blocked users
              </DialogTitle>
              <DialogDescription className="mt-1 text-[12px] leading-snug">
                They can&apos;t view your profile, message you, or match with you.
              </DialogDescription>
            </div>
          </div>

          <div className="space-y-3">
            {!showLoading && !isError ? (
              <p className="text-[12px] text-muted-foreground">{blockedCountMeta(count)}</p>
            ) : null}

            {showLoading ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/20 py-10 text-sm text-muted-foreground">
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                Loading block list…
              </div>
            ) : null}

            {isError ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-muted/20 px-4 py-8 text-center">
                <p className="text-[13px] text-muted-foreground">
                  {getApiErrorMessage(error, "Could not load block list")}
                </p>
              </div>
            ) : null}

            {!showLoading && !isError && count === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-muted/15 px-4 py-8 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted/80 text-muted-foreground">
                  <UserX className="h-5 w-5" aria-hidden />
                </span>
                <p className="text-[13px] font-medium text-foreground">No blocked users</p>
                <p className="max-w-[240px] text-[12px] leading-snug text-muted-foreground">
                  When you block someone from their profile, they&apos;ll show up here.
                </p>
              </div>
            ) : null}

            {!showLoading && !isError && count > 0 ? (
              <ul className="flex max-h-[min(50dvh,16rem)] flex-col gap-2 overflow-y-auto pr-0.5">
                {items.map((item) => (
                  <li key={item.userId}>
                    <BlockedUserRow item={item} onUnblockRequest={setPendingUnblock} />
                  </li>
                ))}
              </ul>
            ) : null}

            {!showLoading && !isError && count > 0 ? (
              <p className="text-center text-[11px] leading-snug text-muted-foreground">
                Unblocking lets them view your profile and connect again.
              </p>
            ) : null}
          </div>

          <DialogFooterActions
            isError={isError}
            isEmpty={!showLoading && !isError && count === 0}
            onClose={() => onOpenChange(false)}
            onRetry={() => void refetch()}
          />
        </DialogContent>
      </Dialog>

      {pendingUnblock ? (
        <UnblockUserDialog
          open
          onOpenChange={(next) => !next && setPendingUnblock(null)}
          onConfirm={handleConfirmUnblock}
          isSubmitting={isUnblocking}
          peer={{
            name: blockedUserLabel(pendingUnblock),
            image: pendingUnblock.image,
            username: pendingUnblock.username,
          }}
        />
      ) : null}
    </>
  );
}

function DialogFooterActions({
  isError,
  isEmpty,
  onClose,
  onRetry,
}: {
  isError: boolean;
  isEmpty: boolean;
  onClose: () => void;
  onRetry: () => void;
}) {
  if (isError) {
    return (
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-3" onClick={onClose}>
          Close
        </Button>
        <Button type="button" className="flex-2" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-3" onClick={onClose}>
          Done
        </Button>
        <Button type="button" className="flex-2" asChild>
          <Link href="/connections">View connections</Link>
        </Button>
      </div>
    );
  }

  return (
    <Button type="button" variant="outline" className="w-full" onClick={onClose}>
      Done
    </Button>
  );
}
