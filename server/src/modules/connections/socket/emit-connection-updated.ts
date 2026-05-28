import { emitToUser } from "@/core/socket";

export type ConnectionUpdatedSocketPayload = {
  peerUserId: string;
  connectionId: string;
  status: "accepted" | "pending" | "rejected" | "cancelled" | "none";
};

/** Pushes live connection state to a user's clients (in-call hover, lists, etc.). */
export function emitConnectionUpdated(
  recipientUserId: string,
  payload: ConnectionUpdatedSocketPayload,
): void {
  emitToUser(recipientUserId, "connection:updated", payload);
}

type ConnectionPairRow = {
  id: string;
  requesterId: string;
  addresseeId: string;
};

/** Notifies the other user in a connection pair that state changed. */
export function emitConnectionUpdatedToPeer(
  actorUserId: string,
  row: ConnectionPairRow,
  status: ConnectionUpdatedSocketPayload["status"],
): void {
  const recipientUserId =
    row.requesterId === actorUserId ? row.addresseeId : row.requesterId;
  emitConnectionUpdated(recipientUserId, {
    peerUserId: actorUserId,
    connectionId: row.id,
    status,
  });
}
