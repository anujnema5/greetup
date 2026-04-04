/** `id` is the authenticated user id (JWT `sub`). */
export interface PeerRecord {
  id: string;
  roomId: string;
  joinedAt: string;
  rtcInstanceId?: string;
  socketId?: string;
  displayName?: string;
}
