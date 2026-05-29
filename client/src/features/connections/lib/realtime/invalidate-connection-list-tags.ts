import type { PublicProfileConnectionState } from "@/features/user-profile/types/public-profile.types";

/** RTK list tags to refresh after a live connection change (not MatchPeerPreview). */
export function connectionListInvalidationTags(connectionState: PublicProfileConnectionState) {
  const tags: { type: "Connections"; id: string }[] = [{ type: "Connections", id: "LIST" }];

  if (connectionState === "accepted") {
    tags.push({ type: "Connections", id: "ACCEPTED_INFINITE" });
  } else if (connectionState === "pending_incoming") {
    tags.push({ type: "Connections", id: "PENDING_INCOMING_COUNT" });
  } else if (connectionState === "none" || connectionState === "cancelled") {
    tags.push({ type: "Connections", id: "ACCEPTED_INFINITE" });
  }

  return tags;
}
