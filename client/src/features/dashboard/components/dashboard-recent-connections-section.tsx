"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { useMyConnections } from "@/features/connections/api/connections.queries";
import { PeerContactActionIcons } from "@/features/connections/components/peer-contact-action-icons";
import type { PeerContactTarget } from "@/features/connections/hooks/use-peer-contact-actions";
import { usePeerContactActions } from "@/features/connections/hooks/use-peer-contact-actions";
import type { ConnectionListItem } from "@/features/connections/types/connections-api.types";
import { formatProfileHandle } from "@/features/app-shell/lib/page-header-account";
import { profileAvatarGradientClass } from "@/features/profile/lib/profile-insights-display";
import { OnlinePresenceDot, usePeersOnlineStatus } from "@/features/presence";
import { getProfileImageUrl } from "@/lib/ui/profile-image";
import { DASHBOARD_SECTIONS } from "@/lib/copy/user-messages";
import { cn } from "@/lib/utils";

import { DashboardSectionHeader } from "./dashboard-section-header";

const RECENT_CONNECTIONS_PREVIEW_LIMIT = 3;

function connectionPeerLabel(item: ConnectionListItem): string {
  return item.peer.displayName?.trim() || item.peer.name || "Member";
}

function connectionPeerSubtitle(item: ConnectionListItem): string {
  const handle = formatProfileHandle(item.peer.username);
  return handle ?? "Connected";
}

function connectionToPeer(item: ConnectionListItem): PeerContactTarget {
  return {
    peerUserId: item.peer.userId,
    displayName: connectionPeerLabel(item),
    image: item.peer.image,
  };
}

function ConnectionRowSkeleton() {
  return (
    <div className="flex items-center gap-2 rounded-xl px-2 py-2.5">
      <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="h-3 w-20 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-6 w-6 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    </div>
  );
}

type RecentConnectionRowProps = {
  item: ConnectionListItem;
  isOnline: boolean;
  isCalling: boolean;
  isMessaging: boolean;
  onMessage: (peer: PeerContactTarget) => void;
  onCall: (peer: PeerContactTarget, mode: "audio" | "video") => void;
};

function RecentConnectionRow({
  item,
  isOnline,
  isCalling,
  isMessaging,
  onMessage,
  onCall,
}: RecentConnectionRowProps) {
  const profileHref = item.peer.username
    ? `/u/${encodeURIComponent(item.peer.username)}`
    : null;
  const title = connectionPeerLabel(item);
  const subtitle = connectionPeerSubtitle(item);
  const avatarSrc = getProfileImageUrl(item.peer.image);
  const initials = title.charAt(0).toUpperCase() || "?";
  const peer = connectionToPeer(item);

  const profileBlock = (
    <>
      <div className="relative shrink-0">
        {item.peer.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarSrc} alt="" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br text-xs font-bold text-white",
              profileAvatarGradientClass(item.peer.userId),
            )}
          >
            {initials}
          </div>
        )}
        <OnlinePresenceDot
          isOnline={isOnline}
          size="md"
          borderClassName="border-card"
          className="absolute -bottom-0.5 -right-0.5"
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-foreground">{title}</p>
        <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>
      </div>
    </>
  );

  return (
    <div className="group flex items-center gap-1 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-muted/60">
      {profileHref ? (
        <Link href={profileHref} className="flex min-w-0 flex-1 items-center gap-3">
          {profileBlock}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{profileBlock}</div>
      )}
      <PeerContactActionIcons
        isCalling={isCalling}
        isMessaging={isMessaging}
        onMessage={() => onMessage(peer)}
        onCall={(mode) => onCall(peer, mode)}
      />
    </div>
  );
}

export function DashboardRecentConnectionsSection() {
  const router = useRouter();
  const {
    startPeerCall,
    openPeerMessage,
    isCallingPeerId,
    isMessagingPeerId,
    isStartingCall,
    isOpeningMessage,
  } = usePeerContactActions();

  const { data, isLoading, isFetching } = useMyConnections({
    filter: "accepted",
    limit: RECENT_CONNECTIONS_PREVIEW_LIMIT,
    page: 1,
  });

  const connections = useMemo(
    () => data?.items ?? [],
    [data?.items],
  );

  const peerIds = useMemo(
    () => connections.map((item) => item.peer.userId),
    [connections],
  );

  const { isOnline } = usePeersOnlineStatus(peerIds);
  const loading = isLoading || isFetching;
  const hasMore = (data?.hasMore ?? false) || connections.length > 0;

  return (
    <section>
      <DashboardSectionHeader
        variant="panel"
        title={DASHBOARD_SECTIONS.recentConnections.title}
        actionLabel={hasMore ? DASHBOARD_SECTIONS.recentConnections.seeAll : undefined}
        onAction={hasMore ? () => router.push("/connections") : undefined}
      />

      {loading ? (
        <div className="flex flex-col gap-0.5">
          {Array.from({ length: 3 }).map((_, index) => (
            <ConnectionRowSkeleton key={index} />
          ))}
        </div>
      ) : connections.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/30 px-3 py-4 text-center text-xs leading-relaxed text-muted-foreground">
          {DASHBOARD_SECTIONS.recentConnections.empty}
        </p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {connections.map((item) => (
            <RecentConnectionRow
              key={item.connectionId}
              item={item}
              isOnline={isOnline(item.peer.userId)}
              onMessage={(peer) => void openPeerMessage(peer)}
              onCall={(peer, mode) => void startPeerCall(peer, mode)}
              isCalling={isStartingCall && isCallingPeerId === item.peer.userId}
              isMessaging={isOpeningMessage && isMessagingPeerId === item.peer.userId}
            />
          ))}
        </div>
      )}
    </section>
  );
}
