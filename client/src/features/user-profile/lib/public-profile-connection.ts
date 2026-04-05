import type { PublicProfileData } from "../types/public-profile.types";

/** What to show under the avatar for someone else’s profile (connection row). */
export type PublicProfileConnectionPanel =
  | { kind: "connect" }
  | { kind: "pending_outgoing" }
  | { kind: "pending_incoming" }
  | { kind: "accepted" }
  | { kind: "none" };

export function getPublicProfileConnectionPanel(
  profile: PublicProfileData,
): PublicProfileConnectionPanel {
  if (profile.isViewer) {
    return { kind: "none" };
  }

  switch (profile.connectionState) {
    case "accepted":
      return { kind: "accepted" };
    case "pending_outgoing":
      return { kind: "pending_outgoing" };
    case "pending_incoming":
      return { kind: "pending_incoming" };
    case "none":
    case "rejected":
    case "cancelled":
      return { kind: "connect" };
  }
}
