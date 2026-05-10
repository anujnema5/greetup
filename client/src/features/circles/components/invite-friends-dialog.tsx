"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ConnectionListItem } from "@/features/connections/types/connections-api.types";

export type InviteFriendsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connections: ConnectionListItem[];
  connectionsLoading: boolean;
  /** Current selection from parent; copied into draft when dialog opens. */
  selectedIds: Set<string>;
  onConfirm: (ids: Set<string>) => void;
};

function peerLabel(peer: ConnectionListItem["peer"]) {
  return (peer.displayName ?? peer.name ?? "").trim();
}

export function InviteFriendsDialog({
  open,
  onOpenChange,
  connections,
  connectionsLoading,
  selectedIds,
  onConfirm,
}: InviteFriendsDialogProps) {
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setDraft(new Set(selectedIds));
      setSearch("");
    });
  }, [open, selectedIds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return connections;
    return connections.filter(({ peer }) => {
      const label = peerLabel(peer).toLowerCase();
      const name = (peer.name ?? "").toLowerCase();
      return label.includes(q) || name.includes(q);
    });
  }, [connections, search]);

  const toggle = useCallback((userId: string) => {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }, []);

  const handleConfirm = () => {
    onConfirm(draft);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "flex max-h-[min(85vh,560px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md",
          "z-100 rounded-2xl border-border/60 shadow-2xl",
        )}
      >
        <DialogHeader className="shrink-0 space-y-1 border-b border-border/40 px-5 pt-5 pb-4 text-left">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Invite peoples
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Pick who should get a heads-up—search below and confirm with Invite.
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 border-b border-border/40 px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="h-10 border-border/80 bg-muted/20 pl-9"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {connectionsLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              Loading connections…
            </div>
          ) : connections.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-muted-foreground">
              No connections yet. Connect with people in the app first, then
              come back here to add them.
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-muted-foreground">
              No results for &ldquo;{search.trim()}&rdquo;
            </p>
          ) : (
            <ul className="space-y-0.5">
              {filtered.map(({ peer }) => {
                const label = peerLabel(peer) || peer.name || "Unknown";
                const checked = draft.has(peer.userId);
                return (
                  <li key={peer.userId}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                        "hover:bg-muted/50",
                        checked && "bg-muted/30",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggle(peer.userId)}
                      />
                      <span
                        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground"
                        style={
                          peer.image
                            ? {
                                backgroundImage: `url(${peer.image})`,
                                backgroundSize: "cover",
                              }
                            : undefined
                        }
                      >
                        {!peer.image ? label.slice(0, 1).toUpperCase() : null}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                        {label}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border/40 px-5 py-4">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="cursor-pointer"
            onClick={handleConfirm}
            disabled={connectionsLoading}
          >
            Invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
