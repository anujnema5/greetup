export type PublicProfileConnectionState =
  | "none"
  | "pending_outgoing"
  | "pending_incoming"
  | "accepted"
  | "rejected"
  | "cancelled";

export type ConnectionRowForPublicProfile = {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
};

/**
 * Up to two DB rows can exist for the same pair (one per direction). We resolve what
 * the viewer should see in priority order: accepted → pending → terminal states.
 */
export function resolveConnectionForPublicProfile(
  rows: ConnectionRowForPublicProfile[],
  viewerId: string,
): { connectionState: PublicProfileConnectionState; connectionId: string | null } {
  if (rows.length === 0) {
    return { connectionState: "none", connectionId: null };
  }

  const accepted = rows.find((r) => r.status === "accepted");
  if (accepted) {
    return { connectionState: "accepted", connectionId: accepted.id };
  }

  const pending = rows.find((r) => r.status === "pending");
  if (pending) {
    const outgoing = pending.requesterId === viewerId;
    const connectionState: PublicProfileConnectionState = outgoing
      ? "pending_outgoing"
      : "pending_incoming";
    return { connectionState, connectionId: pending.id };
  }

  const stale = rows.find((r) => r.status === "rejected" || r.status === "cancelled");
  if (stale) {
    return {
      connectionState: stale.status === "rejected" ? "rejected" : "cancelled",
      connectionId: stale.id,
    };
  }

  return { connectionState: "none", connectionId: rows[0]?.id ?? null };
}
