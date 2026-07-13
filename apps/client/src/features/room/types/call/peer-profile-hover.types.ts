import type { ReactNode } from "react";
import type { PublicProfileConnectionState } from "@/features/user-profile/types/public-profile.types";
import type { PublicProfileConnectionPanel } from "@/features/user-profile/lib/public-profile-connection";

/** Props for the tile name badge hover profile snippet. */
export type PeerProfileHoverSnippetProps = {
  peerUserId: string;
  fallbackDisplayName: string;
  fallbackImageUrl?: string | null;
  badgeClassName?: string;
  children: ReactNode;
};

/** Normalized fields rendered inside the hover card. */
export type PeerProfileHoverDisplay = {
  displayName: string;
  profession: string | null;
  headline: string | null;
  showHeadline: boolean;
  initials: string;
  interestTags: string[];
  moreInterestsCount: number;
  isOnline: boolean;
  insight: string | null;
  imageUrl: string | null;
  username: string | null;
  profileHref: string | null;
  connectionState: PublicProfileConnectionState;
  connectionId: string | null;
  connectionPanel: PublicProfileConnectionPanel;
};

export type PeerProfileHoverFallback = {
  displayName: string;
  imageUrl?: string | null;
};
