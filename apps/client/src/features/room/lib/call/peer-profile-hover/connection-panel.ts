import { getConnectionPanelForState } from "@/features/user-profile/lib/public-profile-connection";
import type { PublicProfileConnectionPanel } from "@/features/user-profile/lib/public-profile-connection";
import type { PublicProfileConnectionState } from "@/features/user-profile/types/public-profile.types";

/** Maps preview connection fields to hover-card CTA variants. */
export function getPeerProfileConnectionPanel(
  connectionState: PublicProfileConnectionState,
  connectionId: string | null,
): PublicProfileConnectionPanel {
  return getConnectionPanelForState(connectionState, connectionId);
}
