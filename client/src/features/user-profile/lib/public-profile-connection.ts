import type { PublicProfileData } from "../types/public-profile.types";

/** Connection CTA under the avatar on someone else’s public profile. */
export type PublicProfileConnectionPanel =
  | { kind: "connect" }
  | { kind: "pending_outgoing"; connectionId: string }
  | { kind: "pending_incoming"; connectionId: string }
  | { kind: "accepted"; connectionId: string }
  | { kind: "none" };

function panelWithRequiredId(
  kind: "accepted" | "pending_outgoing" | "pending_incoming",
  connectionId: string | null | undefined,
): PublicProfileConnectionPanel {
  return connectionId ? { kind, connectionId } : { kind: "none" };
}

/** Maps API `connectionState` + `connectionId` to UI variants (withdraw, accept, etc.). */
export function getConnectionPanelForState(
  connectionState: PublicProfileData["connectionState"],
  connectionId: string | null,
  options?: { isViewer?: boolean },
): PublicProfileConnectionPanel {
  if (options?.isViewer) {
    return { kind: "none" };
  }

  switch (connectionState) {
    case "accepted":
      return panelWithRequiredId("accepted", connectionId);
    case "pending_outgoing":
      return panelWithRequiredId("pending_outgoing", connectionId);
    case "pending_incoming":
      return panelWithRequiredId("pending_incoming", connectionId);
    case "none":
    case "rejected":
    case "cancelled":
      return { kind: "connect" };
  }
}

export function getPublicProfileConnectionPanel(
  profile: PublicProfileData,
): PublicProfileConnectionPanel {
  return getConnectionPanelForState(profile.connectionState, profile.connectionId, {
    isViewer: profile.isViewer,
  });
}
