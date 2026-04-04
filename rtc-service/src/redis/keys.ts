export const Keys = {
  room: (roomId: string) => `rtc:room:${roomId}`,
  /** Which rtc-service instance owns the mediasoup Router for this room (STRING, instance id). */
  roomOwner: (roomId: string) => `rtc:room:${roomId}:owner`,
  roomPeers: (roomId: string) => `rtc:room:${roomId}:peers`,
  peer: (peerId: string) => `rtc:peer:${peerId}`,
  /** Optional cross-service fan-out (producer joined / left, etc.). */
  roomEventsChannel: (roomId: string) => `rtc:room:${roomId}:events`,
} as const;
