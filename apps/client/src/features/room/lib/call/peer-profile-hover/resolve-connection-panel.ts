import type { PublicProfileConnectionPanel } from "@/features/user-profile/lib/public-profile-connection";
import type { PublicProfileConnectionState } from "@/features/user-profile/types/public-profile.types";

export function isTerminalConnectionState(state: PublicProfileConnectionState): boolean {
  return state === "none" || state === "rejected" || state === "cancelled";
}

export function panelsEquivalent(
  a: PublicProfileConnectionPanel,
  b: PublicProfileConnectionPanel,
): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "connect" || a.kind === "none") return true;
  if (b.kind === "connect" || b.kind === "none") return false;
  return a.connectionId === b.connectionId;
}

/**
 * Prefer server/live sync when it has moved past a stale optimistic override
 * (e.g. remote accepted or removed the connection).
 */
export function resolveHoverConnectionPanel(args: {
  panelOverride: PublicProfileConnectionPanel | null;
  serverPanel: PublicProfileConnectionPanel;
  effectiveState: PublicProfileConnectionState;
}): PublicProfileConnectionPanel {
  const { panelOverride, serverPanel, effectiveState } = args;
  if (!panelOverride) return serverPanel;

  if (isTerminalConnectionState(effectiveState)) return serverPanel;
  if (effectiveState === "accepted" && panelOverride.kind !== "accepted") return serverPanel;
  if (effectiveState === "pending_incoming" && panelOverride.kind === "connect") {
    return serverPanel;
  }

  return panelOverride;
}

export function shouldClearPanelOverride(args: {
  panelOverride: PublicProfileConnectionPanel;
  serverPanel: PublicProfileConnectionPanel;
  effectiveState: PublicProfileConnectionState;
  liveSyncIsTerminal: boolean;
}): boolean {
  const { panelOverride, serverPanel, effectiveState, liveSyncIsTerminal } = args;

  if (liveSyncIsTerminal) return true;
  if (effectiveState === "accepted" && panelOverride.kind !== "accepted") return true;
  if (effectiveState === "pending_incoming" && panelOverride.kind === "connect") return true;

  if (
    isTerminalConnectionState(effectiveState) &&
    (panelOverride.kind === "accepted" ||
      panelOverride.kind === "pending_outgoing" ||
      panelOverride.kind === "pending_incoming")
  ) {
    return true;
  }

  return panelsEquivalent(serverPanel, panelOverride);
}
