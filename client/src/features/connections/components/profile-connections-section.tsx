"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Loader2, Search, UserPlus } from "lucide-react";

import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

import {
  useAcceptedConnectionsInfiniteQuery,
  useGetMyConnectionsQuery,
} from "@/features/connections/api/connections-api";
import type { ConnectionListItem } from "@/features/connections/types/connections-api.types";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ACCEPTED_PAGE_SIZE = 20;
const ACCEPTED_PREVIEW_LIMIT = 6;

function peerLabel(item: ConnectionListItem) {
  return item.peer.displayName?.trim() || item.peer.name || "Member";
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function rtkErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "data" in error) {
    const d = (error as FetchBaseQueryError).data;
    if (d && typeof d === "object" && "message" in d && typeof (d as { message?: string }).message === "string") {
      return (d as { message: string }).message;
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong";
}

function ConnectionRow({ item }: { item: ConnectionListItem }) {
  const label = peerLabel(item);
  const sub =
    item.status === "pending" && item.direction
      ? item.direction === "incoming"
        ? "Wants to connect"
        : "Request sent"
      : "Connected";

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3",
        "transition-colors duration-150",
      )}
    >
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-linear-to-br from-primary/90 to-primary/70 flex items-center justify-center text-xs font-bold text-primary-foreground">
        {item.peer.image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={item.peer.image} alt="" className="h-full w-full object-cover" />
        ) : (
          initials(label)
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{sub}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
    </div>
  );
}

export type ProfileConnectionsSectionProps = {
  variant?: "profile" | "page";
  showSeeAllLink?: boolean;
};

export function ProfileConnectionsSection({
  variant = "profile",
  showSeeAllLink = false,
}: ProfileConnectionsSectionProps) {
  const isPage = variant === "page";
  const [search, setSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(search.trim()), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const incoming = useGetMyConnectionsQuery({ filter: "pending_incoming" });
  const outgoing = useGetMyConnectionsQuery({ filter: "pending_outgoing" });

  const acceptedPreview = useGetMyConnectionsQuery(
    { filter: "accepted", limit: ACCEPTED_PREVIEW_LIMIT, page: 1 },
    { skip: isPage },
  );

  const acceptedInfinite = useAcceptedConnectionsInfiniteQuery(
    { limit: ACCEPTED_PAGE_SIZE, q: debouncedQ || undefined },
    { skip: !isPage },
  );

  const loadingCore =
    incoming.isLoading ||
    outgoing.isLoading ||
    (isPage ? acceptedInfinite.isLoading : acceptedPreview.isLoading);

  const hasError =
    incoming.isError || outgoing.isError || (isPage ? acceptedInfinite.isError : acceptedPreview.isError);
  const error = incoming.error ?? outgoing.error ?? (isPage ? acceptedInfinite.error : acceptedPreview.error);

  const incomingItems = incoming.data?.data?.items ?? [];
  const outgoingItems = outgoing.data?.data?.items ?? [];

  const acceptedItems: ConnectionListItem[] = useMemo(() => {
    if (isPage) {
      return acceptedInfinite.data?.pages.flatMap((p) => p.items) ?? [];
    }
    return acceptedPreview.data?.data?.items ?? [];
  }, [isPage, acceptedInfinite.data, acceptedPreview.data]);

  const previewHasMore = acceptedPreview.data?.data?.hasMore === true;

  const hasNextAcceptedPage = isPage ? acceptedInfinite.hasNextPage : false;
  const isFetchingNextAccepted = isPage ? acceptedInfinite.isFetchingNextPage : false;

  const fetchNextAccepted = acceptedInfinite.fetchNextPage;

  const onIntersectLoadMore = useCallback(() => {
    if (!isPage || !hasNextAcceptedPage || isFetchingNextAccepted) return;
    void fetchNextAccepted();
  }, [isPage, hasNextAcceptedPage, isFetchingNextAccepted, fetchNextAccepted]);

  useEffect(() => {
    if (!isPage) return;
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
  }, [isPage, onIntersectLoadMore, acceptedItems.length, debouncedQ]);

  const refetchAll = () => {
    void incoming.refetch();
    void outgoing.refetch();
    if (isPage) void acceptedInfinite.refetch();
    else void acceptedPreview.refetch();
  };

  if (loadingCore) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          {!isPage && (
            <h3 className="text-sm font-semibold text-foreground">Connections</h3>
          )}
          <Loader2
            className={cn("h-4 w-4 animate-spin text-muted-foreground", isPage ? "ml-auto" : "")}
            aria-label="Loading"
          />
        </div>
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[58px] animate-pulse rounded-2xl border border-border bg-muted/40"
            />
          ))}
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="rounded-2xl border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <UserPlus className="h-4 w-4 text-primary" />
          {!isPage && (
            <h3 className="text-sm font-semibold text-foreground">Connections</h3>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-2">{rtkErrorMessage(error)}</p>
        <button
          type="button"
          onClick={() => refetchAll()}
          className="text-xs font-medium text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const totalPending = incomingItems.length + outgoingItems.length;
  const hasAny =
    acceptedItems.length > 0 || incomingItems.length > 0 || outgoingItems.length > 0;

  if (!hasAny) {
    return (
      <div className="flex flex-col gap-3">
        {!isPage && (
          <div>
            <h3 className="text-sm font-semibold text-foreground">Connections</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">0 connected</p>
          </div>
        )}
        {isPage && (
          <p className="text-[11px] text-muted-foreground">0 connected · 0 pending</p>
        )}
        {isPage ? (
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none"
              aria-hidden
            />
            <Input
              type="search"
              placeholder="Search connections…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl bg-card"
              autoComplete="off"
            />
          </div>
        ) : null}
        <p className="text-sm text-muted-foreground rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
          No connection requests or connections yet. When you connect with people, they&apos;ll show up
          here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {!isPage && (
            <h3 className="text-sm font-semibold text-foreground">Connections</h3>
          )}
          <p
            className={cn(
              "text-[11px] text-muted-foreground",
              !isPage ? "mt-0.5" : "",
            )}
          >
            {!isPage && previewHasMore
              ? `${acceptedItems.length}+`
              : acceptedItems.length}{" "}
            connected
            {totalPending > 0 ? ` · ${totalPending} pending` : ""}
          </p>
        </div>
        {showSeeAllLink && !isPage && (
          <Link
            href="/connections"
            className="shrink-0 text-xs font-medium text-primary hover:underline pt-0.5"
          >
            See all
          </Link>
        )}
      </div>

      {isPage && (
        <div className="relative w-full">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none z-10"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl bg-card w-full min-h-11 text-base sm:text-sm"
            autoComplete="off"
            enterKeyHint="search"
          />
        </div>
      )}

      {incomingItems.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground px-1">
            Incoming requests
          </p>
          <div className="flex flex-col gap-2">
            {incomingItems.map((item) => (
              <ConnectionRow key={item.connectionId} item={item} />
            ))}
          </div>
        </div>
      )}

      {outgoingItems.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground px-1">
            Sent requests
          </p>
          <div className="flex flex-col gap-2">
            {outgoingItems.map((item) => (
              <ConnectionRow key={item.connectionId} item={item} />
            ))}
          </div>
        </div>
      )}

      {acceptedItems.length > 0 && (
        <div className="flex flex-col gap-2">
          {(incomingItems.length > 0 || outgoingItems.length > 0) && (
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground px-1">
              Your network
            </p>
          )}
          <div className="flex flex-col gap-2">
            {acceptedItems.map((item) => (
              <ConnectionRow key={item.connectionId} item={item} />
            ))}
          </div>
          {isPage && (
            <>
              <div ref={loadMoreSentinelRef} className="h-1 w-full shrink-0" aria-hidden />
              {isFetchingNextAccepted ? (
                <div className="flex justify-center py-3">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading more" />
                </div>
              ) : null}
            </>
          )}
        </div>
      )}

      {isPage && acceptedItems.length === 0 && debouncedQ.length > 0 && (
        <p className="text-sm text-muted-foreground text-center py-4 rounded-2xl border border-dashed border-border">
          No connections match &ldquo;{debouncedQ}&rdquo;.
        </p>
      )}

      {acceptedItems.length === 0 && (incomingItems.length > 0 || outgoingItems.length > 0) && (
        <p className="text-xs text-muted-foreground px-1">
          Accepted connections will appear here after you respond to requests.
        </p>
      )}
    </div>
  );
}
