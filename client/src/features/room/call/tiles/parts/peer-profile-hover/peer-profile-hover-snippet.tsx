"use client";

import { createPortal } from "react-dom";
import {
  useOpenPeerProfileFromCall,
  usePeerProfileHoverAnchor,
  usePeerProfileHoverPreview,
} from "@/features/room/hooks/call/peer-profile-hover";
import {
  PEER_PROFILE_HOVER_PANEL_CLASS,
  PEER_PROFILE_HOVER_TRIGGER_CLASS,
} from "@/features/room/constants/call/peer-profile-hover";
import type { PeerProfileHoverSnippetProps } from "@/features/room/types/call/peer-profile-hover.types";
import { cn } from "@/lib/utils";
import { TileNameBadge } from "../tile-overlays";
import { PeerProfileHoverCard } from "./peer-profile-hover-card";

/** Instagram-style mini profile on hover; click tile name to dock call and open profile. */
export function PeerProfileHoverSnippet({
  peerUserId,
  fallbackDisplayName,
  fallbackImageUrl,
  badgeClassName,
  children,
}: PeerProfileHoverSnippetProps) {
  const openProfile = useOpenPeerProfileFromCall();

  if (!peerUserId.trim()) {
    return <TileNameBadge className={badgeClassName}>{children}</TileNameBadge>;
  }

  const { anchorRef, open, coords, show, hide } = usePeerProfileHoverAnchor();
  const { display, isFetching } = usePeerProfileHoverPreview({
    peerUserId,
    enabled: true,
    displayName: fallbackDisplayName,
    imageUrl: fallbackImageUrl,
  });

  const handleTileNameClick = () => {
    hide();
    openProfile(display.username);
  };

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={cn(PEER_PROFILE_HOVER_TRIGGER_CLASS, badgeClassName)}
        aria-label={`View ${fallbackDisplayName}'s profile`}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={handleTileNameClick}
      >
        {children}
      </button>

      {open && coords && typeof document !== "undefined"
        ? createPortal(
            <div
              className={cn("fixed", PEER_PROFILE_HOVER_PANEL_CLASS)}
              style={{
                left: coords.left,
                top: coords.top,
                transform: "translateY(calc(-100% - 8px))",
              }}
              onMouseEnter={show}
              onMouseLeave={hide}
            >
              <PeerProfileHoverCard
                peerUserId={peerUserId}
                display={display}
                isFetching={isFetching}
                onNavigateProfile={hide}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
