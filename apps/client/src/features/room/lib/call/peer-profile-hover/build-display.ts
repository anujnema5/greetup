import type { MatchPeerPreview } from "@/features/matching/types/matching-api.types";
import { publicProfileHref } from "@/features/user-profile/lib/public-profile-href";
import type {
  PeerProfileHoverDisplay,
  PeerProfileHoverFallback,
} from "@/features/room/types/call/peer-profile-hover.types";
import { getPeerProfileConnectionPanel } from "./connection-panel";

export function buildPeerProfileHoverDisplay(
  preview: MatchPeerPreview | undefined,
  fallback: PeerProfileHoverFallback,
): PeerProfileHoverDisplay {
  const displayName = preview?.displayName?.trim() || fallback.displayName;
  const profession = preview?.profession?.trim() || null;
  const headline = preview?.headline?.trim() || null;
  const showHeadline = Boolean(headline && headline !== profession);
  const imageUrl = preview?.image?.trim() || fallback.imageUrl?.trim() || null;
  const username = preview?.username?.trim() || null;
  const connectionState = preview?.connectionState ?? "none";
  const connectionId = preview?.connectionId ?? null;

  return {
    displayName,
    profession,
    headline,
    showHeadline,
    initials: preview?.initials ?? displayName.charAt(0).toUpperCase(),
    interestTags: preview?.interestTags ?? [],
    moreInterestsCount: preview?.moreInterestsCount ?? 0,
    isOnline: preview?.isOnline ?? true,
    insight: preview?.insight?.trim() || null,
    imageUrl,
    username,
    profileHref: publicProfileHref(username),
    connectionState,
    connectionId,
    connectionPanel: getPeerProfileConnectionPanel(connectionState, connectionId),
  };
}
