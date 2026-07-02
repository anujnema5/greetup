"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronRight, Loader2, Search, UserMinus, UserPlus } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { SectionHeader } from "@/components/section-header";
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
import { formatProfileHandle } from "@/features/app-shell/lib/page-header-account";
import { getApiErrorMessage } from "@/lib/api/fetch-client";
import { PeerContactActionIcons } from "@/features/connections/components/peer-contact-action-icons";
import type { PeerContactTarget } from "@/features/connections/hooks/use-peer-contact-actions";
import { usePeerContactActions } from "@/features/connections/hooks/use-peer-contact-actions";
import type {
  ConnectionListItem,
  PeerCallStatusEntry,
} from "@/features/connections/types/connections-api.types";
import { profileAvatarGradientClass } from "@/features/profile/lib/profile-insights-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getProfileImageUrl } from "@/lib/ui/profile-image";
import { OnlinePresenceDot } from "@/features/presence";
import { cn } from "@/lib/utils";
import { nameInitials } from "@/lib/utils/name-initials";
import { CONNECTIONS, PROFILE_SECTIONS } from "@/lib/copy/user-messages";
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
  userId,
  title,
  subtitle,
  titleExtra,
  isOnline,
}: {
  imageUrl: string | null;
  userId: string;
  title: string;
  subtitle: string;
  titleExtra?: ReactNode;
  isOnline?: boolean;
}) {
  const initials = nameInitials(title);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
      <div className="relative shrink-0">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getProfileImageUrl(imageUrl)}
            alt=""
            className="size-10 rounded-full object-cover"
          />
        ) : (
          <div
            className={cn(
              "flex size-10 items-center justify-center rounded-full bg-linear-to-br text-[11px] font-bold text-white",
              profileAvatarGradientClass(userId),
            )}
          >
            {initials}
          </div>
        )}
        <OnlinePresenceDot
          isOnline={isOnline ?? false}
          size="sm"
          borderClassName="border-card"
          className="absolute -bottom-0.5 -right-0.5"
        />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="min-w-0 truncate text-sm font-medium leading-tight text-foreground">
            {title}
          </p>
          {titleExtra}
        </div>
        <p className="truncate text-left text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function connectionRowSubtitle(item: ConnectionListItem): string {
  const handle = formatProfileHandle(item.peer.username);
  if (item.status === "pending" && item.direction) {
    return item.direction === "incoming" ? "Wants to connect" : "Request sent";
  }
  return handle ?? "Connected";
}

const connectionRowShellClass =
  "group flex flex-col gap-1.5 rounded-xl border border-border/70 bg-card px-3 py-2.5 transition-colors duration-150 hover:bg-muted/15";

const connectionRowSelectedClass =
  "border-primary/35 bg-primary/5 shadow-sm ring-1 ring-primary/15";

function ConnectionsStatsBar({
  connectedCount,
  pendingCount,
  connectedHasMore = false,
}: {
  connectedCount: number;
  pendingCount: number;
  connectedHasMore?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center rounded-full border border-border/70 bg-muted/30 px-2.5 py-1 text-xs font-medium text-foreground">
        {connectedHasMore ? `${connectedCount}+` : connectedCount} connected
      </span>
      {pendingCount > 0 ? (
        <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/8 px-2.5 py-1 text-xs font-medium text-primary">
          {pendingCount} pending
        </span>
      ) : null}
    </div>
  );
}

function ConnectionsSearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative w-full">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        placeholder={CONNECTIONS.searchPlaceholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-xl border-border/80 bg-background/60 pl-9 text-sm shadow-none"
        autoComplete="off"
        enterKeyHint="search"
      />
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
  const sub = connectionRowSubtitle(item);
  const isAccepted = item.status === "accepted";
  const isPendingOutgoing = item.status === "pending" && item.direction === "outgoing";
  const inCallBadge =
    isAccepted && peerCallStatus?.inLiveRoom ? (
      <span className="shrink-0 rounded-full bg-destructive/12 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
        In call
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
        connectionRowShellClass,
        isSelected && connectionRowSelectedClass,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <ConnectionPeerTrigger
          username={peerUsername}
          label={label}
          onSelectProfile={onSelectProfile}
          isSelected={isSelected}
          className="min-w-0 flex-1 text-left"
        >
          <ConnectionPeerSummary
            imageUrl={item.peer.image}
            userId={item.peer.userId}
            title={label}
            subtitle={sub}
            titleExtra={inCallBadge}
            isOnline={peerCallStatus?.isOnline}
          />
        </ConnectionPeerTrigger>

        <div className="flex shrink-0 items-center gap-0.5">
          {isAccepted && onPeerMessage && onPeerCall ? (
            <PeerContactActionIcons
              size="md"
              isCalling={isCallingPeer}
              isMessaging={isMessagingPeer}
              onMessage={() => onPeerMessage(peer)}
              onCall={(mode) => onPeerCall(peer, mode)}
              className="opacity-80 transition-opacity group-hover:opacity-100"
            />
          ) : null}
          {busy ? (
            <Loader2
              className="size-4 shrink-0 animate-spin text-muted-foreground"
              aria-label="Loading"
            />
          ) : null}
          {isAccepted ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 rounded-lg text-muted-foreground/70 hover:bg-destructive/10 hover:text-destructive"
              disabled={busy}
              onClick={() => setConfirmOpen(true)}
              aria-label={`Remove ${label}`}
              title="Remove connection"
            >
              <UserMinus className="size-3.5" strokeWidth={2} />
            </Button>
          ) : isPendingOutgoing ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 shrink-0 rounded-lg px-2.5 text-xs"
              disabled={busy}
              onClick={() => setWithdrawConfirmOpen(true)}
            >
              Withdraw
            </Button>
          ) : (
            <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" aria-hidden />
          )}
        </div>
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
      userId={item.peer.userId}
      title={label}
      subtitle="Wants to connect"
    />
  );

  return (
    <div
      className={cn(
        connectionRowShellClass,
        isSelected && connectionRowSelectedClass,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <ConnectionPeerTrigger
          username={peerUsername}
          label={label}
          onSelectProfile={onSelectProfile}
          isSelected={isSelected}
          className="min-w-0 flex-1 text-left"
        >
          {summary}
        </ConnectionPeerTrigger>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {busy ? (
            <Loader2
              className="size-4 shrink-0 animate-spin text-muted-foreground"
              aria-label="Loading"
            />
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 rounded-lg px-2.5 text-xs"
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
            className="h-7 rounded-lg px-2.5 text-xs"
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
      <div className="flex flex-col gap-4">
        {isPage && (
          <>
            <ConnectionsStatsBar
              connectedCount={0}
              pendingCount={0}
            />
            <ConnectionsSearchInput
              value={search}
              onChange={setSearch}
            />
          </>
        )}
        {!isPage && (
          <div>
            <h3 className="text-sm font-semibold text-foreground">Connections</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">0 connected</p>
          </div>
        )}
        <p className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm leading-relaxed text-muted-foreground">
          {PROFILE_SECTIONS.connections.emptyLong}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {!isPage ? (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Connections</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {!isPage && previewHasMore
                ? `${acceptedItems.length}+`
                : acceptedItems.length}{" "}
              connected
              {totalPending > 0 ? ` · ${totalPending} pending` : ""}
            </p>
          </div>
          {showSeeAllLink && (
            <Link
              href="/connections"
              className="shrink-0 pt-0.5 text-xs font-medium text-primary hover:underline"
            >
              See all
            </Link>
          )}
        </div>
      ) : (
        <>
          <ConnectionsStatsBar
            connectedCount={acceptedItems.length}
            pendingCount={totalPending}
            connectedHasMore={previewHasMore && !isPage}
          />
          <ConnectionsSearchInput value={search} onChange={setSearch} />
        </>
      )}

      {incomingItems.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionHeader
            variant="panel"
            title={CONNECTIONS.sections.incoming}
            className="mb-1 px-0.5"
          />
          <div className="flex flex-col gap-1.5">
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
          <SectionHeader
            variant="panel"
            title={CONNECTIONS.sections.outgoing}
            className="mb-1 px-0.5"
          />
          <div className="flex flex-col gap-1.5">
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
            <SectionHeader
              variant="panel"
              title={CONNECTIONS.sections.network}
              className="mb-1 px-0.5"
            />
          )}
          <div className="flex flex-col gap-1.5">
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
        <p className="rounded-xl border border-dashed border-border/80 py-6 text-center text-sm text-muted-foreground">
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
