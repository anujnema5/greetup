"use client";

import Image from "next/image";
import { Briefcase, ExternalLink } from "lucide-react";
import type { PeerProfileHoverDisplay } from "@/features/room/types/call/peer-profile-hover.types";
import {
  useOpenPeerProfileFromCall,
  usePeerProfileHoverConnectionPanel,
} from "@/features/room/hooks/call/peer-profile-hover";
import { cn } from "@/lib/utils";
import { PeerProfileHoverConnectionActions } from "./peer-profile-hover-connection-actions";

type PeerProfileHoverCardProps = {
  peerUserId: string;
  display: PeerProfileHoverDisplay;
  isFetching: boolean;
  onNavigateProfile?: () => void;
};

export function PeerProfileHoverCard({
  peerUserId,
  display,
  isFetching,
  onNavigateProfile,
}: PeerProfileHoverCardProps) {
  const openProfile = useOpenPeerProfileFromCall();
  const connection = usePeerProfileHoverConnectionPanel({
    peerUserId,
    username: display.username,
    connectionState: display.connectionState,
    connectionId: display.connectionId,
  });

  const {
    displayName,
    profession,
    headline,
    showHeadline,
    initials,
    interestTags,
    moreInterestsCount,
    isOnline,
    insight,
    imageUrl,
    profileHref,
  } = display;

  const visibleTags = interestTags.slice(0, 4);
  const canOpenProfile = Boolean(profileHref);

  const handleOpenProfile = () => {
    if (!canOpenProfile) return;
    onNavigateProfile?.();
    openProfile(display.username);
  };

  return (
    <div className="flex flex-col gap-3 p-3.5">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={handleOpenProfile}
          disabled={!canOpenProfile}
          className={cn(
            "relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring",
            canOpenProfile && "cursor-pointer",
          )}
          aria-label={canOpenProfile ? `Open ${displayName}'s profile` : undefined}
        >
          <div className="flex size-14 items-center justify-center overflow-hidden rounded-full border border-border/80 bg-muted text-base font-bold text-foreground shadow-sm">
            {isFetching ? (
              <span className="size-5 animate-pulse rounded-md bg-muted-foreground/25" />
            ) : imageUrl?.trim() ? (
              <Image
                src={imageUrl.trim()}
                alt=""
                width={56}
                height={56}
                className="size-full object-cover"
                unoptimized
              />
            ) : (
              initials
            )}
          </div>
          {isOnline ? (
            <span
              className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-popover bg-emerald-500"
              aria-hidden
            />
          ) : null}
        </button>

        <div className="min-w-0 flex-1 pt-0.5">
          {canOpenProfile ? (
            <button
              type="button"
              onClick={handleOpenProfile}
              className="group flex max-w-full cursor-pointer items-center gap-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
            >
              <span className="truncate text-sm font-semibold text-foreground group-hover:underline">
                {displayName}
              </span>
              <ExternalLink
                className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden
              />
            </button>
          ) : (
            <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
          )}
          {profession ? (
            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-foreground/90">
              <Briefcase className="size-3 shrink-0 text-muted-foreground" strokeWidth={2.2} aria-hidden />
              <span className="truncate">{profession}</span>
            </p>
          ) : null}
          {showHeadline && headline ? (
            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">{headline}</p>
          ) : !profession ? (
            <p className="mt-0.5 text-xs text-muted-foreground/80">In this call</p>
          ) : null}
        </div>
      </div>

      {insight ? (
        <p className="rounded-lg border border-border/60 bg-muted/40 px-2.5 py-2 text-[11px] leading-snug text-foreground/90">
          {insight}
        </p>
      ) : null}

      {(visibleTags.length > 0 || moreInterestsCount > 0) && (
        <div className="flex flex-wrap gap-1">
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-border/70 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          {moreInterestsCount > 0 ? (
            <span className="rounded-md border border-border/70 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/80">
              +{moreInterestsCount}
            </span>
          ) : null}
        </div>
      )}

      <PeerProfileHoverConnectionActions
        panel={connection.panel}
        isConnecting={connection.isConnecting}
        isDisconnecting={connection.isDisconnecting}
        isWithdrawing={connection.isWithdrawing}
        isAccepting={connection.isAccepting}
        isRejecting={connection.isRejecting}
        isPendingOptimistic={connection.isPendingOptimistic}
        onConnect={connection.onConnect}
        onDisconnect={connection.onDisconnect}
        onWithdraw={connection.onWithdraw}
        onAccept={connection.onAccept}
        onReject={connection.onReject}
      />
    </div>
  );
}
