"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search, UserRound, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAcceptedConnectionsInfiniteQuery } from "@/features/connections/api/connections-api";
import { useUpdateRoomInviteSettingsMutation } from "@/features/profile-setup/components/profile-setup-api";
import { cn } from "@/lib/utils";

import { ProfileEditShell } from "./profile-edit-shell";

const PAGE_SIZE = 20;

export type RoomInviteState = {
  policy: "all_connections" | "selected_only";
  allowlistedUserIds: string[];
};

type RoomInviteSettingsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: RoomInviteState;
};

function peerLabel(name: string, displayName: string | null) {
  const d = displayName?.trim();
  if (d) return d;
  return name?.trim() || "Member";
}

export function RoomInviteSettingsModal({
  open,
  onOpenChange,
  initial,
}: RoomInviteSettingsModalProps) {
  const [search, setSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(search.trim()), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const [policy, setPolicy] = useState<RoomInviteState["policy"]>(initial.policy);
  const [selectedIds, setSelectedIds] = useState<string[]>(initial.allowlistedUserIds);

  const connectionsEnabled = open && policy === "selected_only";

  const acceptedInfinite = useAcceptedConnectionsInfiniteQuery(
    { limit: PAGE_SIZE, q: debouncedQ || undefined },
    { skip: !connectionsEnabled },
  );

  useEffect(() => {
    if (open) {
      setPolicy(initial.policy);
      setSelectedIds(initial.allowlistedUserIds);
      setSearch("");
      setDebouncedQ("");
    }
  }, [open, initial.policy, initial.allowlistedUserIds]);

  const items = useMemo(
    () => acceptedInfinite.data?.pages.flatMap((p) => p.items) ?? [],
    [acceptedInfinite.data],
  );

  const hasNextPage = acceptedInfinite.hasNextPage;
  const isFetchingNextPage = acceptedInfinite.isFetchingNextPage;
  const fetchNextPage = acceptedInfinite.fetchNextPage;
  const connectionsLoading = acceptedInfinite.isLoading;

  const onIntersectLoadMore = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (!connectionsEnabled) return;
    const el = loadMoreSentinelRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onIntersectLoadMore();
      },
      { root: null, rootMargin: "120px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [connectionsEnabled, onIntersectLoadMore, items.length, debouncedQ]);

  const [updateSettings, { isLoading: saving }] = useUpdateRoomInviteSettingsMutation();

  const friendlySummary = useMemo(() => {
    if (policy === "all_connections") {
      return "Your friends on Circlo can add you when they start a circle and send invites.";
    }
    if (selectedIds.length === 0) {
      return "You haven’t picked anyone yet — people you don’t choose won’t be able to add you this way.";
    }
    return `You’ve picked ${selectedIds.length} ${selectedIds.length === 1 ? "person" : "people"}.`;
  }, [policy, selectedIds.length]);

  const togglePeer = (userId: string) => {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const handleSave = async () => {
    try {
      await updateSettings({
        policy,
        allowlistedUserIds: policy === "selected_only" ? selectedIds : [],
      }).unwrap();
      toast.success("Your choice was saved");
      onOpenChange(false);
    } catch {
      toast.error("Something went wrong — try again");
    }
  };

  const footer = (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
      <Button
        type="button"
        variant="outline"
        className="w-full sm:w-auto rounded-xl"
        onClick={() => onOpenChange(false)}
      >
        Close
      </Button>
      <Button
        type="button"
        className="w-full sm:w-auto rounded-xl"
        onClick={() => void handleSave()}
        disabled={saving}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
      </Button>
    </div>
  );

  return (
    <ProfileEditShell
      open={open}
      onOpenChange={onOpenChange}
      title="Who can invite you to a circle?"
      description="When a friend creates a circle and adds people, you decide who is allowed to include you on that list."
      footer={footer}
    >
      <div className="flex flex-col gap-5">
        <p className="text-[13px] text-muted-foreground leading-relaxed">{friendlySummary}</p>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => setPolicy("all_connections")}
            className={cn(
              "flex w-full items-start gap-3 rounded-2xl border-2 p-3.5 text-left transition-all",
              "min-h-16 active:scale-[0.99] sm:gap-4 sm:p-4",
              policy === "all_connections"
                ? "border-primary bg-primary/8 shadow-sm"
                : "border-border/80 bg-muted/30 hover:bg-muted/50",
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11",
                policy === "all_connections" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground",
              )}
            >
              <Users className="h-[18px] w-[18px] sm:h-5 sm:w-5" aria-hidden />
            </span>
            <span className="min-w-0 pt-0.5">
              <span className="block text-[13px] font-semibold text-foreground leading-tight">
                Everyone I know here
              </span>
              <span className="mt-1 block text-[12px] text-muted-foreground leading-snug">
                Any friend you’re connected with can add you when they set up a circle.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPolicy("selected_only")}
            className={cn(
              "flex w-full items-start gap-3 rounded-2xl border-2 p-3.5 text-left transition-all",
              "min-h-16 active:scale-[0.99] sm:gap-4 sm:p-4",
              policy === "selected_only"
                ? "border-primary bg-primary/8 shadow-sm"
                : "border-border/80 bg-muted/30 hover:bg-muted/50",
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11",
                policy === "selected_only" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground",
              )}
            >
              <UserRound className="h-[18px] w-[18px] sm:h-5 sm:w-5" aria-hidden />
            </span>
            <span className="min-w-0 pt-0.5">
              <span className="block text-[13px] font-semibold text-foreground leading-tight">
                Only people I choose
              </span>
              <span className="mt-1 block text-[12px] text-muted-foreground leading-snug">
                Pick names from your friends list. Everyone else won’t be able to add you.
              </span>
            </span>
          </button>
        </div>

        {policy === "selected_only" ? (
          <div className="flex flex-col gap-2.5 min-w-0 rounded-2xl bg-muted/25 p-3 sm:p-4 border border-border/60">
            <div>
              <p className="text-[13px] font-semibold text-foreground">Choose people</p>
              <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
                Type a name to find someone, or scroll the list.
              </p>
            </div>
            <div className="relative w-full">
              <Search
                className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none"
                aria-hidden
              />
              <Input
                type="search"
                placeholder="Find someone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-9 rounded-xl bg-background border-border/80 w-full text-[13px] placeholder:text-muted-foreground/80"
                autoComplete="off"
                enterKeyHint="search"
              />
            </div>

            {connectionsLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8">
                <Loader2 className="h-7 w-7 animate-spin text-primary/80" aria-label="Loading" />
                <p className="text-[13px] text-muted-foreground">Loading your friends…</p>
              </div>
            ) : items.length === 0 ? (
              <p className="text-[13px] text-muted-foreground text-center py-5 px-2 leading-relaxed">
                {debouncedQ.length > 0 ? (
                  <>No one matches “{debouncedQ}”. Try another name.</>
                ) : (
                  <>You don’t have any connections yet. Connect with people first, then come back here.</>
                )}
              </p>
            ) : (
              <ul className="flex flex-col gap-2 pb-1">
                {items.map((row) => {
                  const id = row.peer.userId;
                  const label = peerLabel(row.peer.name, row.peer.displayName);
                  const checked = selectedIds.includes(id);
                  return (
                    <li key={row.connectionId}>
                      <button
                        type="button"
                        onClick={() => togglePeer(id)}
                        className={cn(
                          "flex w-full min-h-11 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors",
                          "border-2",
                          checked
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-transparent bg-background hover:bg-muted/60",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-[10px] font-bold",
                            checked
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/35 bg-background",
                          )}
                          aria-hidden
                        >
                          {checked ? "✓" : ""}
                        </span>
                        <span className="truncate text-[13px] font-medium text-foreground">{label}</span>
                      </button>
                    </li>
                  );
                })}
                <div ref={loadMoreSentinelRef} className="h-3 w-full shrink-0" aria-hidden />
                {isFetchingNextPage ? (
                  <li className="flex justify-center py-3 list-none">
                    <Loader2 className="h-6 w-6 animate-spin text-primary/70" aria-label="Loading more" />
                  </li>
                ) : null}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </ProfileEditShell>
  );
}
