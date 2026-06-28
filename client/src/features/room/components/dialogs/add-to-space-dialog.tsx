"use client";

import { useMemo, useState } from "react";
import { Loader2, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useRoomInvite } from "@/features/room/api/room.mutations";
import { getApiErrorMessage } from "@/lib/api/fetch-client";
import {
  useMyConnections,
  usePeersCallStatus,
} from "@/features/connections/api/connections.queries";
import type { ConnectionListItem } from "@/features/connections/types/connections-api.types";
import { CALL_ROOM_FORCED_DARK_CLASS } from "@/features/room/constants/call/call-chrome-theme";
import { cn } from "@/lib/utils";
import {
  COMPACT_DIALOG_BODY,
  COMPACT_DIALOG_CAPTION,
  COMPACT_DIALOG_DESCRIPTION,
  COMPACT_DIALOG_ICON_WRAP,
  COMPACT_DIALOG_LABEL,
  COMPACT_DIALOG_TITLE,
} from "@/lib/ui/compact-dialog-typography";

function peerLabel(item: ConnectionListItem): string {
  return item.peer.displayName?.trim() || item.peer.name || "Member";
}

export type AddToSpaceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  /** Do not offer people already on this call (you + remote peer). */
  excludeUserIds: string[];
};

export function AddToSpaceDialog({
  open,
  onOpenChange,
  roomId,
  excludeUserIds,
}: AddToSpaceDialogProps) {
  const [search, setSearch] = useState("");
  const exclude = useMemo(() => new Set(excludeUserIds.filter(Boolean)), [excludeUserIds]);

  const { data, isLoading } = useMyConnections(
    { filter: "accepted", limit: 50, page: 1 },
    { enabled: open },
  );

  const items = useMemo(() => {
    const raw = data?.items ?? [];
    return raw.filter(
      (i: ConnectionListItem) => i.status === "accepted" && !exclude.has(i.peer.userId),
    );
  }, [data?.items, exclude]);

  const peerIds = useMemo(
    () => items.map((i: ConnectionListItem) => i.peer.userId).sort(),
    [items],
  );

  const {
    data: statusMap,
    isFetching: statusLoading,
    refetch: refetchStatuses,
  } = usePeersCallStatus(peerIds, {
    enabled: open && peerIds.length > 0,
    refetchOnMount: true,
  });

  const { mutateAsync: sendRoomInvite } = useRoomInvite();
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i: ConnectionListItem) => peerLabel(i).toLowerCase().includes(q));
  }, [items, search]);

  async function getLatestPeerStatus(userId: string) {
    const current = statusMap?.[userId];
    if (current?.isOnline) return current;
    try {
      const fresh = await refetchStatuses();
      return fresh.data?.[userId] ?? current;
    } catch {
      return current;
    }
  }

  const onInvite = async (item: ConnectionListItem) => {
    const targetUserId = item.peer.userId;
    if (!targetUserId) {
      toast.error("Could not identify this person.");
      return;
    }
    const st = await getLatestPeerStatus(targetUserId);
    if (!st?.isOnline) {
      toast.error("This person is offline.");
      return;
    }
    if (st.inLiveRoom) {
      toast.error("They are already in another call.");
      return;
    }
    try {
      setInvitingUserId(targetUserId);
      await sendRoomInvite({ roomId, inviteeUserId: targetUserId });
      toast.success(`Invite sent to ${peerLabel(item)}`);
      onOpenChange(false);
      setSearch("");
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Could not send invite"));
    } finally {
      setInvitingUserId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(CALL_ROOM_FORCED_DARK_CLASS, "z-200 sm:max-w-md")}
        overlayClassName="z-199"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5" />
            Add to space
          </DialogTitle>
          <DialogDescription>
            Invite someone you are connected with. They must be online and not already in another call.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search connections…"
            className="pl-9"
          />
        </div>

        <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className={cn("py-8 text-center", COMPACT_DIALOG_BODY)}>
              No connections match. Only people you are connected with appear here.
            </p>
          ) : (
            filtered.map((item: ConnectionListItem) => {
              const st = statusMap?.[item.peer.userId];
              const statusKnown = Boolean(st);
              const online = st?.isOnline === true;
              const inOther = st?.inLiveRoom === true;
              const rowInviting = invitingUserId === item.peer.userId;
              const canInvite = statusKnown && online && !inOther && !statusLoading && !invitingUserId;
              const label = peerLabel(item);
              return (
                <div
                  key={item.connectionId}
                  className="flex items-center gap-3 rounded-xl border border-border/80 bg-card/50 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate font-medium", COMPACT_DIALOG_LABEL)}>{label}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      {!statusKnown || statusLoading ? (
                        <span className="text-[10px] text-muted-foreground">Checking status…</span>
                      ) : !online ? (
                        <span className="text-[10px] text-muted-foreground">Offline</span>
                      ) : inOther ? (
                        <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-medium text-destructive">
                          In a call
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Online</span>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className={cn("shrink-0 rounded-lg")}
                    disabled={!canInvite || rowInviting}
                    onClick={() => void onInvite(item)}
                  >
                    {rowInviting ? <Loader2 className="size-4 animate-spin" /> : "Invite"}
                  </Button>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
