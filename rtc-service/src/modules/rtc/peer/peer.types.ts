export interface PeerRecord {
  id: string;
  roomId: string;
  joinedAt: string;
  rtcInstanceId?: string;
  socketId?: string;
  displayName?: string;
}
