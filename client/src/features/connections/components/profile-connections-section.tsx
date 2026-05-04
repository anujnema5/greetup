"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronRight, Loader2, Search, UserPlus } from "lucide-react";
import { useSearchParams } from "next/navigation";

import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

import {
  useAcceptConnectionMutation,
  useAcceptedConnectionsInfiniteQuery,
  useDisconnectConnectionMutation,
  useGetMyConnectionsQuery,
  usePeersCallStatusQuery,
  useRejectConnectionMutation,
  useWithdrawConnectionRequestMutation,
} from "@/features/connections/api/connections-api";
import type {
  ConnectionListItem,
  PeerCallStatusEntry,
} from "@/features/connections/types/connections-api.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getProfileImageUrl } from "@/lib/ui/profile-image";
import { cn } from "@/lib/utils";
import { DisconnectConnectionDialog } from "./disconnect-connection-dialog";
import { WithdrawRequestDialog } from "./withdraw-request-dialog";
import { toast } from "sonner";

const ACCEPTED_PAGE_SIZE = 20;
const ACCEPTED_PREVIEW_LIMIT = 6;

function peerLabel(item: ConnectionListItem) {
  return item.peer.displayName?.trim() || item.peer.name || "Member";
}

/** Path for public profile when the peer has a username; otherwise null. */
function publicProfileHref(username: string | null | undefined): string | null {
  const u = username?.trim();
  return u ? `/u/${encodeURIComponent(u)}` : null;
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

function ConnectionPeerSummary({
  imageUrl,
  title,
  subtitle,
  titleExtra,
}: {
  imageUrl: string | null;
  title: string;
  subtitle: string;
  titleExtra?: ReactNode;
}) {
  return (
    <>
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted/30">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={getProfileImageUrl(imageUrl)} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="min-w-0 truncate text-sm font-semibold text-foreground">{title}</p>
          {titleExtra}
        </div>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </>
  );
}

function ConnectionRow({
  item,
  peerCallStatus,
}: {
  item: ConnectionListItem;
  peerCallStatus?: PeerCallStatusEntry;
}) {
  const [disconnect] = useDisconnectConnectionMutation();
  const [withdraw] = useWithdrawConnectionRequestMutation();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [withdrawConfirmOpen, setWithdrawConfirmOpen] = useState(false);
  const label = peerLabel(item);
  const profileHref = publicProfileHref(item.peer.username);
  const sub =
    item.status === "pending" && item.direction
      ? item.direction === "incoming"
        ? "Wants to connect"
        : "Request sent"
      : "Connected";
  const isAccepted = item.status === "accepted";
  const isPendingOutgoing = item.status === "pending" && item.direction === "outgoing";
  const inCallBadge =
    isAccepted && peerCallStatus?.inLiveRoom ? (
      <span className="shrink-0 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
        In a call
      </span>
    ) : null;

  const mutationArg = {
    connectionId: item.connectionId,
    peerUsername: item.peer.username,
  };

  const onDisconnect = () => {
    setActionError(null);
    setBusy(true);
    void disconnect(mutationArg)
      .unwrap()
      .then(() => {
        setConfirmOpen(false);
        toast.success("Connection removed");
      })
      .catch((e: unknown) => {
        const msg = rtkErrorMessage(e);
        setActionError(msg);
        toast.error(msg);
      })
      .finally(() => setBusy(false));
  };

  const onWithdraw = () => {
    setActionError(null);
    setBusy(true);
    void withdraw(mutationArg)
      .unwrap()
      .then(() => {
        setWithdrawConfirmOpen(false);
        toast.success("Request withdrawn");
      })
      .catch((e: unknown) => {
        const msg = rtkErrorMessage(e);
        setActionError(msg);
        toast.error(msg);
      })
      .finally(() => setBusy(false));
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-2xl border border-border bg-card px-4 py-3",
        "transition-colors duration-150",
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {profileHref ? (
          <Link
            href={profileHref}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl outline-none hover:opacity-90 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Open ${label} profile`}
          >
            <ConnectionPeerSummary
              imageUrl={item.peer.image}
              title={label}
              subtitle={sub}
              titleExtra={inCallBadge}
            />
          </Link>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <ConnectionPeerSummary
              imageUrl={item.peer.image}
              title={label}
              subtitle={sub}
              titleExtra={inCallBadge}
            />
          </div>
        )}
        {busy ? (
          <Loader2
            className="h-4 w-4 shrink-0 animate-spin text-muted-foreground"
            aria-label="Loading"
          />
        ) : null}
        {isAccepted ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl shrink-0"
            disabled={busy}
            onClick={() => setConfirmOpen(true)}
          >
            Remove
          </Button>
        ) : isPendingOutgoing ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl shrink-0"
            disabled={busy}
            onClick={() => setWithdrawConfirmOpen(true)}
          >
            Withdraw
          </Button>
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
        )}
      </div>
      {actionError ? (
        <p className="text-xs text-destructive px-0.5" role="alert">
          {actionError}
        </p>
      ) : null}
      {isAccepted ? (
        <DisconnectConnectionDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          onConfirm={onDisconnect}
          isSubmitting={busy}
          peer={{
            name: label,
            image: item.peer.image,
            username: item.peer.username,
          }}
        />
      ) : null}
      {isPendingOutgoing ? (
        <WithdrawRequestDialog
          open={withdrawConfirmOpen}
          onOpenChange={setWithdrawConfirmOpen}
          onConfirm={onWithdraw}
          isSubmitting={busy}
          peer={{
            name: label,
            image: item.peer.image,
            username: item.peer.username,
          }}
        />
      ) : null}
    </div>
  );
}

function IncomingRequestRow({ item }: { item: ConnectionListItem }) {
  const [accept] = useAcceptConnectionMutation();
  const [reject] = useRejectConnectionMutation();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const label = peerLabel(item);
  const profileHref = publicProfileHref(item.peer.username);

  const mutationArg = {
    connectionId: item.connectionId,
    peerUsername: item.peer.username,
  };

  const runRespond = (promise: Promise<unknown>) => {
    setActionError(null);
    setBusy(true);
    void promise
      .then(() => {
        toast.success("Request updated");
      })
      .catch((e: unknown) => {
        const msg = rtkErrorMessage(e);
        setActionError(msg);
        toast.error(msg);
      })
      .finally(() => setBusy(false));
  };

  const summary = (
    <ConnectionPeerSummary
      imageUrl={item.peer.image}
      title={label}
      subtitle="Wants to connect"
    />
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-2xl border border-border bg-card px-4 py-3",
        "transition-colors duration-150",
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {profileHref ? (
          <Link
            href={profileHref}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl outline-none hover:opacity-90 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            {summary}
          </Link>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3">{summary}</div>
        )}
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {busy ? (
            <Loader2
              className="h-4 w-4 shrink-0 animate-spin text-muted-foreground"
              aria-label="Loading"
            />
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            disabled={busy}
            onClick={() => runRespond(reject(mutationArg).unwrap())}
          >
            Reject
          </Button>
          <Button
            type="button"
            size="sm"
            className="rounded-xl"
            disabled={busy}
            onClick={() => runRespond(accept(mutationArg).unwrap())}
          >
            Accept
          </Button>
        </div>
      </div>
      {actionError ? (
        <p className="text-xs text-destructive px-0.5" role="alert">
          {actionError}
        </p>
      ) : null}
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
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const routeFilter = searchParams.get("filter");

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(search.trim()), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const incoming = useGetMyConnectionsQuery(
    { filter: "pending_incoming" },
    { refetchOnMountOrArgChange: true, refetchOnFocus: true, refetchOnReconnect: true },
  );
  const outgoing = useGetMyConnectionsQuery(
    { filter: "pending_outgoing" },
    { refetchOnMountOrArgChange: true, refetchOnFocus: true, refetchOnReconnect: true },
  );

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

  const acceptedPeerStatusKey = useMemo(
    () =>
      acceptedItems
        .filter((i) => i.status === "accepted")
        .map((i) => i.peer.userId)
        .sort()
        .join("|"),
    [acceptedItems],
  );

  const { data: peerCallStatuses } = usePeersCallStatusQuery(acceptedPeerStatusKey, {
    skip: acceptedPeerStatusKey.length === 0,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });

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
          className="cursor-pointer text-xs font-medium text-primary hover:underline"
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
            className="pl-9 rounded-xl bg-card w-full min-h-11 text-sm"
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
              <IncomingRequestRow key={item.connectionId} item={item} />
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
              <ConnectionRow
                key={item.connectionId}
                item={item}
                peerCallStatus={peerCallStatuses?.[item.peer.userId]}
              />
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
      {isPage && routeFilter === "pending_incoming" && incomingItems.length === 0 ? (
        <p className="text-xs text-muted-foreground px-1">
          No incoming requests right now. Check Sent requests below.
        </p>
      ) : null}
    </div>
  );
}
