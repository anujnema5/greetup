"use client";

import { useLayoutEffect, useRef } from "react";
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
export function PeerProfileHoverSnippet(props: PeerProfileHoverSnippetProps) {
  if (!props.peerUserId.trim()) {
    return <TileNameBadge className={props.badgeClassName}>{props.children}</TileNameBadge>;
  }

  return <PeerProfileHoverSnippetInner {...props} />;
}

function PeerProfileHoverSnippetInner({
  peerUserId,
  fallbackDisplayName,
  fallbackImageUrl,
  badgeClassName,
  children,
}: PeerProfileHoverSnippetProps) {
  const openProfile = useOpenPeerProfileFromCall();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const { anchorRef, open, coords, show, hide } = usePeerProfileHoverAnchor();
  const { display, isFetching } = usePeerProfileHoverPreview({
    peerUserId,
    enabled: true,
    displayName: fallbackDisplayName,
    imageUrl: fallbackImageUrl,
  });

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel || !coords) {
      return;
    }
    panel.style.setProperty("--peer-hover-left", `${coords.left}px`);
    panel.style.setProperty("--peer-hover-top", `${coords.top}px`);
  }, [coords]);

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
              ref={panelRef}
              className={cn(
                "peer-profile-hover-panel-positioned fixed",
                PEER_PROFILE_HOVER_PANEL_CLASS,
              )}
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
