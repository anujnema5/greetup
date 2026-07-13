/** Payload for the global `connection:updated` socket event. */
export type ConnectionUpdatedSocketPayload = {
  peerUserId?: string;
  connectionId?: string;
  status?: "accepted" | "pending" | "rejected" | "cancelled" | "none";
  peer_user_id?: string;
  connection_id?: string;
};

/** Minimal notification row fields on `notification:new` for connection sync. */
export type ConnectionNotificationSocketRow = {
  type?: string;
  actorUserId?: string | null;
  entityId?: string;
  entityType?: string;
  actor_user_id?: string | null;
  entity_id?: string;
  entity_type?: string;
};
