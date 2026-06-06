"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Zap } from "lucide-react";

import { PeerContactActionIcons } from "@/features/connections/components/peer-contact-action-icons";
import type { PeerContactTarget } from "@/features/connections/hooks/use-peer-contact-actions";
import { usePeerContactActions } from "@/features/connections/hooks/use-peer-contact-actions";
import { OnlinePresenceDot, usePeersOnlineStatus } from "@/features/presence";
import { getProfileImageUrl } from "@/lib/ui/profile-image";
import { PROFILE_SECTIONS, RECENT_MATCHES } from "@/lib/copy/user-messages";
import { cn } from "@/lib/utils";

import {
  profileAvatarGradientClass,
  recentMatchHistoryLabel,
} from "../lib/profile-insights-display";
import { RecentMatchesDialog } from "./recent-matches-dialog";
import type { ProfileRecentMatch } from "../types/profile-insights.types";

type ProfileRecentMatchesSectionProps = {
  matches: ProfileRecentMatch[];
  isLoading?: boolean;
};

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
    <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3">
      <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-muted" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3 w-28 animate-pulse rounded bg-muted" />
        <div className="h-3 w-40 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-7 w-7 animate-pulse rounded-md bg-muted" />
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
  const profileHref = match.username ? `/u/${match.username}` : null;
  const avatarSrc = getProfileImageUrl(match.image);
  const peer = matchToPeer(match);

  const profileBlock = (
    <>
      <div className="relative shrink-0">
        {match.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarSrc}
            alt=""
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br text-sm font-bold text-white",
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
        <p className="truncate text-[13px] font-semibold text-foreground">{match.displayName}</p>
        <p className="truncate text-[12px] text-muted-foreground">
          {recentMatchHistoryLabel(match)}
        </p>
      </div>

      {match.matchScore != null ? (
        <div className="flex shrink-0 items-center gap-1">
          <Zap size={11} className="text-primary" />
          <span className="text-xs font-semibold text-primary">{match.matchScore}%</span>
        </div>
      ) : null}
    </>
  );

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 transition-colors duration-150 hover:bg-muted/50">
      {profileHref ? (
        <Link href={profileHref} className="flex min-w-0 flex-1 items-center gap-3">
          {profileBlock}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{profileBlock}</div>
      )}
      <PeerContactActionIcons
        size="md"
        callsDisabled={!match.isConnected}
        isCalling={isCalling}
        isMessaging={isMessaging}
        onMessage={() => onMessage(peer)}
        onCall={(mode) => onCall(peer, mode)}
      />
    </div>
  );
}

export function ProfileRecentMatchesSection({
  matches,
  isLoading = false,
}: ProfileRecentMatchesSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const {
    startPeerCall,
    openPeerMessage,
    isCallingPeerId,
    isMessagingPeerId,
    isStartingCall,
    isOpeningMessage,
  } = usePeerContactActions();

  const previewMatches = useMemo(
    () => matches.slice(0, RECENT_MATCHES_PREVIEW_LIMIT),
    [matches],
  );

  const peerIds = previewMatches.map((match) => match.peerUserId);
  const { isOnline } = usePeersOnlineStatus(peerIds);

  return (
    <>
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{PROFILE_SECTIONS.recentMatches.title}</h3>
          {matches.length > 0 ? (
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="cursor-pointer text-xs text-primary hover:underline"
            >
              {PROFILE_SECTIONS.recentMatches.seeAll}
            </button>
          ) : null}
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <MatchRowSkeleton key={index} />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 px-4 py-8 text-center">
            <p className="text-sm font-medium text-foreground">{RECENT_MATCHES.emptyTitle}</p>
            <p className="mt-1 text-xs text-muted-foreground">{RECENT_MATCHES.emptyBody}</p>
            <Link
              href="/home"
              className="mt-3 inline-flex cursor-pointer text-xs font-medium text-primary hover:underline"
            >
              {RECENT_MATCHES.goToHome}
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
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
