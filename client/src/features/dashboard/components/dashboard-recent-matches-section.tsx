"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Zap } from "lucide-react";

import { PeerContactActionIcons } from "@/features/connections/components/peer-contact-action-icons";
import type { PeerContactTarget } from "@/features/connections/hooks/use-peer-contact-actions";
import { usePeerContactActions } from "@/features/connections/hooks/use-peer-contact-actions";
import { RecentMatchesDialog } from "@/features/profile/components/recent-matches-dialog";
import { profileAvatarGradientClass, recentMatchHistoryLabel } from "@/features/profile/lib/profile-insights-display";
import type { ProfileRecentMatch } from "@/features/profile/types/profile-insights.types";
import { OnlinePresenceDot, usePeersOnlineStatus } from "@/features/presence";
import { getProfileImageUrl } from "@/lib/ui/profile-image";
import { cn } from "@/lib/utils";

import { DASHBOARD_SECTIONS } from "@/lib/copy/user-messages";

import { useDashboardInsights } from "../hooks/use-dashboard-insights";

const RECENT_MATCHES_PREVIEW_LIMIT = 3;

function matchToPeer(match: ProfileRecentMatch): PeerContactTarget {
  return {
    peerUserId: match.peerUserId,
    displayName: match.displayName,
    image: match.image,
    isConnected: match.isConnected,
  };
}

function MatchRowSkeleton() {
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

type RecentMatchRowProps = {
  match: ProfileRecentMatch;
  isOnline: boolean;
  isCalling: boolean;
  isMessaging: boolean;
  onMessage: (peer: PeerContactTarget) => void;
  onCall: (peer: PeerContactTarget, mode: "audio" | "video") => void;
};

function RecentMatchRow({
  match,
  isOnline,
  isCalling,
  isMessaging,
  onMessage,
  onCall,
}: RecentMatchRowProps) {
  const profileHref = match.username ? `/u/${encodeURIComponent(match.username)}` : null;
  const avatarSrc = getProfileImageUrl(match.image);
  const subtitle = recentMatchHistoryLabel(match);
  const peer = matchToPeer(match);

  const profileBlock = (
    <>
      <div className="relative shrink-0">
        {match.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarSrc} alt="" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br text-xs font-bold text-white",
              profileAvatarGradientClass(match.peerUserId),
            )}
          >
            {match.initials}
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
        <p className="truncate text-xs font-semibold text-foreground">{match.displayName}</p>
        <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>
      </div>

      {match.matchScore != null ? (
        <div className="flex shrink-0 items-center gap-1 text-[11px] text-primary">
          <Zap size={10} />
          {match.matchScore}%
        </div>
      ) : null}
    </>
  );

  return (
    <div className="flex items-center gap-1.5 rounded-xl px-2 py-2.5 transition-colors duration-150 hover:bg-muted/60">
      {profileHref ? (
        <Link href={profileHref} className="flex min-w-0 flex-1 items-center gap-3">
          {profileBlock}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{profileBlock}</div>
      )}
      <PeerContactActionIcons
        callsDisabled={!match.isConnected}
        isCalling={isCalling}
        isMessaging={isMessaging}
        onMessage={() => onMessage(peer)}
        onCall={(mode) => onCall(peer, mode)}
      />
    </div>
  );
}

export function DashboardRecentMatchesSection() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { insights, isLoading, isFetching } = useDashboardInsights();
  const {
    startPeerCall,
    openPeerMessage,
    isCallingPeerId,
    isMessagingPeerId,
    isStartingCall,
    isOpeningMessage,
  } = usePeerContactActions();

  const previewMatches = useMemo(() => {
    return (insights?.recentMatches ?? []).slice(0, RECENT_MATCHES_PREVIEW_LIMIT);
  }, [insights?.recentMatches]);

  const peerIds = useMemo(
    () => previewMatches.map((match) => match.peerUserId),
    [previewMatches],
  );

  const { isOnline } = usePeersOnlineStatus(peerIds);
  const loading = isLoading || isFetching;
  const hasMatches = (insights?.recentMatches.length ?? 0) > 0;

  return (
    <>
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {DASHBOARD_SECTIONS.recentMatches.title}
          </h3>
          {hasMatches ? (
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="cursor-pointer text-xs text-muted-foreground transition-colors hover:text-primary hover:underline"
            >
              {DASHBOARD_SECTIONS.recentMatches.seeAll}
            </button>
          ) : null}
        </div>

        {loading ? (
          <div className="flex flex-col gap-1">
            {Array.from({ length: 3 }).map((_, index) => (
              <MatchRowSkeleton key={index} />
            ))}
          </div>
        ) : previewMatches.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">
            {DASHBOARD_SECTIONS.recentMatches.empty}
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {previewMatches.map((match) => (
              <RecentMatchRow
                key={`${match.peerUserId}-${match.matchedAt}`}
                match={match}
                isOnline={isOnline(match.peerUserId)}
                onMessage={(peer) => void openPeerMessage(peer)}
                onCall={(peer, mode) => void startPeerCall(peer, mode)}
                isCalling={isStartingCall && isCallingPeerId === match.peerUserId}
                isMessaging={isOpeningMessage && isMessagingPeerId === match.peerUserId}
              />
            ))}
          </div>
        )}
      </div>

      <RecentMatchesDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
