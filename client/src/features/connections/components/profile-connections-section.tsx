"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronRight, Loader2, Search, UserPlus } from "lucide-react";
import { useSearchParams } from "next/navigation";

import {
  useAcceptConnection,
  useDisconnectConnection,
  useRejectConnection,
  useWithdrawConnectionRequest,
} from "@/features/connections/api/connections.mutations";
import {
  useAcceptedConnections,
  useMyConnections,
  usePeersCallStatus,
} from "@/features/connections/api/connections.queries";
import { getApiErrorMessage } from "@/lib/api/fetch-client";
import { PeerContactActionIcons } from "@/features/connections/components/peer-contact-action-icons";
import type { PeerContactTarget } from "@/features/connections/hooks/use-peer-contact-actions";
import { usePeerContactActions } from "@/features/connections/hooks/use-peer-contact-actions";
import type {
  ConnectionListItem,
  PeerCallStatusEntry,
} from "@/features/connections/types/connections-api.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getProfileImageUrl } from "@/lib/ui/profile-image";
import { UserAvatarWithPresence } from "@/features/presence";
import { cn } from "@/lib/utils";
import { PROFILE_SECTIONS } from "@/lib/copy/user-messages";
import { DisconnectConnectionDialog } from "./disconnect-connection-dialog";
import { WithdrawRequestDialog } from "./withdraw-request-dialog";
import { ConnectionsListSkeleton, ConnectionRowSkeleton } from "./connections-skeletons";
import type { ConnectionsPageListLayout } from "../lib/connections-layout";
import { toast } from "sonner";

const ACCEPTED_PAGE_SIZE = 20;
const ACCEPTED_PREVIEW_LIMIT = 6;

function peerLabel(item: ConnectionListItem) {
  return item.peer.displayName?.trim() || item.peer.name || "Member";
}

function connectionToPeer(item: ConnectionListItem): PeerContactTarget {
  return {
    peerUserId: item.peer.userId,
    displayName: peerLabel(item),
    image: item.peer.image,
  };
}

/** Path for public profile when the peer has a username; otherwise null. */
function publicProfileHref(username: string | null | undefined): string | null {
  const u = username?.trim();
  return u ? `/u/${encodeURIComponent(u)}` : null;
}

function ConnectionPeerTrigger({
  username,
  label,
  onSelectProfile,
  isSelected = false,
  className,
  children,
}: {
  username: string | null | undefined;
  label: string;
  onSelectProfile?: (username: string) => void;
  isSelected?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const slug = username?.trim();
  const href = publicProfileHref(slug);

  if (!slug || !href) {
    return <div className={className}>{children}</div>;
  }

  if (onSelectProfile) {
    return (
      <button
        type="button"
        onClick={() => onSelectProfile(slug)}
        className={cn(
          className,
          "cursor-pointer rounded-xl text-left outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring",
        )}
        aria-label={`Open ${label} profile`}
        aria-current={isSelected ? "true" : undefined}
      >
        {children}
      </button>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        className,
        "rounded-xl outline-none hover:opacity-90 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
      )}
      aria-label={`Open ${label} profile`}
    >
      {children}
    </Link>
  );
}

function actionErrorMessage(error: unknown): string {
  return getApiErrorMessage(error, "Something went wrong");
}

function ConnectionPeerSummary({
  imageUrl,
  title,
  subtitle,
  titleExtra,
  isOnline,
}: {
  imageUrl: string | null;
  title: string;
  subtitle: string;
  titleExtra?: ReactNode;
  isOnline?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
      <UserAvatarWithPresence isOnline={isOnline ?? false} borderClassName="border-card">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={getProfileImageUrl(imageUrl)} alt="" className="h-full w-full object-cover" />
        </div>
      </UserAvatarWithPresence>
      <div className="min-w-0 flex-1 text-left">
        <div className="flex min-w-0 items-center gap-2">
          <p className="min-w-0 truncate text-sm font-semibold text-foreground">{title}</p>
          {titleExtra}
        </div>
        <p className="truncate text-left text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function ConnectionRow({
  item,
  peerCallStatus,
  isCallingPeer = false,
  isMessagingPeer = false,
  onPeerMessage,
  onPeerCall,
  isSelected = false,
  onSelectProfile,
  onPeerDisconnected,
}: {
  item: ConnectionListItem;
  peerCallStatus?: PeerCallStatusEntry;
  isCallingPeer?: boolean;
  isMessagingPeer?: boolean;
  onPeerMessage?: (peer: PeerContactTarget) => void;
  onPeerCall?: (peer: PeerContactTarget, mode: "audio" | "video") => void;
  isSelected?: boolean;
  onSelectProfile?: (username: string) => void;
  onPeerDisconnected?: (username: string | null) => void;
}) {
  const { mutateAsync: disconnect } = useDisconnectConnection();
  const { mutateAsync: withdraw } = useWithdrawConnectionRequest();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [withdrawConfirmOpen, setWithdrawConfirmOpen] = useState(false);
  const label = peerLabel(item);
  const peerUsername = item.peer.username?.trim() || null;
  const peer = connectionToPeer(item);
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
      .then(() => {
        setConfirmOpen(false);
        toast.success("Connection removed");
        onPeerDisconnected?.(peerUsername);
      })
      .catch((e: unknown) => {
        const msg = actionErrorMessage(e);
        setActionError(msg);
        toast.error(msg);
      })
      .finally(() => setBusy(false));
  };

  const onWithdraw = () => {
    setActionError(null);
    setBusy(true);
    void withdraw(mutationArg)
      .then(() => {
        setWithdrawConfirmOpen(false);
        toast.success("Request withdrawn");
        onPeerDisconnected?.(peerUsername);
      })
      .catch((e: unknown) => {
        const msg = actionErrorMessage(e);
        setActionError(msg);
        toast.error(msg);
      })
      .finally(() => setBusy(false));
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-2xl border bg-card px-4 py-3",
        "transition-colors duration-200",
        isSelected
          ? "border-primary/40 bg-primary/4 ring-1 ring-primary/20"
          : "border-border",
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <ConnectionPeerTrigger
          username={peerUsername}
          label={label}
          onSelectProfile={onSelectProfile}
          isSelected={isSelected}
          className="min-w-0 flex-1 text-left"
        >
          <ConnectionPeerSummary
            imageUrl={item.peer.image}
            title={label}
            subtitle={sub}
            titleExtra={inCallBadge}
            isOnline={peerCallStatus?.isOnline}
          />
        </ConnectionPeerTrigger>
        {isAccepted && onPeerMessage && onPeerCall ? (
          <PeerContactActionIcons
            size="md"
            isCalling={isCallingPeer}
            isMessaging={isMessagingPeer}
            onMessage={() => onPeerMessage(peer)}
            onCall={(mode) => onPeerCall(peer, mode)}
          />
        ) : null}
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
            className="cursor-pointer rounded-xl shrink-0"
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
            className="cursor-pointer rounded-xl shrink-0"
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

function IncomingRequestRow({
  item,
  isSelected = false,
  onSelectProfile,
  onPeerDisconnected,
}: {
  item: ConnectionListItem;
  isSelected?: boolean;
  onSelectProfile?: (username: string) => void;
  onPeerDisconnected?: (username: string | null) => void;
}) {
  const { mutateAsync: accept } = useAcceptConnection();
  const { mutateAsync: reject } = useRejectConnection();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const label = peerLabel(item);
  const peerUsername = item.peer.username?.trim() || null;

  const mutationArg = {
    connectionId: item.connectionId,
    peerUsername: item.peer.username,
  };

  const runRespond = (promise: Promise<unknown>, onSuccess?: () => void) => {
    setActionError(null);
    setBusy(true);
    void promise
      .then(() => {
        toast.success("Request updated");
        onSuccess?.();
      })
      .catch((e: unknown) => {
        const msg = actionErrorMessage(e);
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
        "flex flex-col gap-2 rounded-2xl border bg-card px-4 py-3",
        "transition-colors duration-200",
        isSelected
          ? "border-primary/40 bg-primary/4 ring-1 ring-primary/20"
          : "border-border",
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <ConnectionPeerTrigger
          username={peerUsername}
          label={label}
          onSelectProfile={onSelectProfile}
          isSelected={isSelected}
          className="min-w-0 flex-1 text-left"
        >
          {summary}
        </ConnectionPeerTrigger>
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
            onClick={() =>
              runRespond(reject(mutationArg), () => onPeerDisconnected?.(peerUsername))
            }
          >
            Reject
          </Button>
          <Button
            type="button"
            size="sm"
            className="rounded-xl"
            disabled={busy}
            onClick={() => runRespond(accept(mutationArg))}
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
  /** Desktop side panel: highlighted connection username. */
  selectedUsername?: string | null;
  /** Desktop opens side panel; mobile navigates to public profile. */
  onSelectProfile?: (username: string) => void;
  /** Close side panel when list row removes the peer. */
  onPeerDisconnected?: (username: string | null) => void;
  /** Desktop list width while loading — matches connections page layout. */
  pageListLayout?: ConnectionsPageListLayout;
};

export function ProfileConnectionsSection({
  variant = "profile",
  showSeeAllLink = false,
  selectedUsername = null,
  onSelectProfile,
  onPeerDisconnected,
  pageListLayout = "centered",
}: ProfileConnectionsSectionProps) {
  const isPage = variant === "page";
  const {
    startPeerCall,
    openPeerMessage,
    isCallingPeerId,
    isMessagingPeerId,
    isStartingCall,
    isOpeningMessage,
  } = usePeerContactActions();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const isPeerSelected = useCallback(
    (username: string | null | undefined) => {
      if (!selectedUsername || !username) return false;
      return selectedUsername === username.trim();
    },
    [selectedUsername],
  );

  const pageSelectProfile = isPage ? onSelectProfile : undefined;
  const pagePeerDisconnected = isPage ? onPeerDisconnected : undefined;

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(search.trim()), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const incoming = useMyConnections({ filter: "pending_incoming" });
  const outgoing = useMyConnections({ filter: "pending_outgoing" });

  const acceptedPreview = useMyConnections(
    { filter: "accepted", limit: ACCEPTED_PREVIEW_LIMIT, page: 1 },
    { enabled: !isPage },
  );

  const acceptedInfinite = useAcceptedConnections(
    { limit: ACCEPTED_PAGE_SIZE, q: debouncedQ || undefined },
    isPage,
  );

  const loadingCore =
    incoming.isLoading ||
    outgoing.isLoading ||
    (isPage ? acceptedInfinite.isLoading : acceptedPreview.isLoading);

  const hasError =
    incoming.isError || outgoing.isError || (isPage ? acceptedInfinite.isError : acceptedPreview.isError);
  const error = incoming.error ?? outgoing.error ?? (isPage ? acceptedInfinite.error : acceptedPreview.error);

  const incomingItems = incoming.data?.items ?? [];
  const outgoingItems = outgoing.data?.items ?? [];

  const acceptedItems: ConnectionListItem[] = useMemo(() => {
    if (isPage) {
      return acceptedInfinite.data?.pages.flatMap((p) => p.items) ?? [];
    }
    return acceptedPreview.data?.items ?? [];
  }, [isPage, acceptedInfinite.data, acceptedPreview.data]);

  const acceptedPeerIds = useMemo(
    () =>
      acceptedItems
        .filter((i) => i.status === "accepted")
        .map((i) => i.peer.userId)
        .sort(),
    [acceptedItems],
  );

  const { data: peerCallStatuses } = usePeersCallStatus(acceptedPeerIds, {
    enabled: acceptedPeerIds.length > 0,
  });

  const previewHasMore = acceptedPreview.data?.hasMore === true;

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

  const routeFilter = searchParams.get("filter");

  const refetchAll = () => {
    void incoming.refetch();
    void outgoing.refetch();
    if (isPage) void acceptedInfinite.refetch();
    else void acceptedPreview.refetch();
  };

  if (loadingCore) {
    return (
      <ConnectionsListSkeleton
        variant={isPage ? "page" : "profile"}
        pageLayout={isPage ? pageListLayout : undefined}
      />
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
        <p className="text-sm text-muted-foreground mb-2">{actionErrorMessage(error)}</p>
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
          {PROFILE_SECTIONS.connections.emptyLong}
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
              <IncomingRequestRow
                key={item.connectionId}
                item={item}
                isSelected={isPeerSelected(item.peer.username)}
                onSelectProfile={pageSelectProfile}
                onPeerDisconnected={pagePeerDisconnected}
              />
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
              <ConnectionRow
                key={item.connectionId}
                item={item}
                isSelected={isPeerSelected(item.peer.username)}
                onSelectProfile={pageSelectProfile}
                onPeerDisconnected={pagePeerDisconnected}
              />
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
                isCallingPeer={isStartingCall && isCallingPeerId === item.peer.userId}
                isMessagingPeer={isOpeningMessage && isMessagingPeerId === item.peer.userId}
                onPeerMessage={(peer) => void openPeerMessage(peer)}
                onPeerCall={(peer, mode) => void startPeerCall(peer, mode)}
                isSelected={isPeerSelected(item.peer.username)}
                onSelectProfile={pageSelectProfile}
                onPeerDisconnected={pagePeerDisconnected}
              />
            ))}
          </div>
          {isPage && (
            <>
              <div ref={loadMoreSentinelRef} className="h-1 w-full shrink-0" aria-hidden />
              {isFetchingNextAccepted ? (
                <div className="flex flex-col gap-2 pt-1" aria-label="Loading more connections">
                  <ConnectionRowSkeleton />
                  <ConnectionRowSkeleton />
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
