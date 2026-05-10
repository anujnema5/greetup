export const Keys = {
  room: (roomId: string) => `rtc:room:${roomId}`,
  /** Which rtc-service instance owns the mediasoup Router for this room (STRING, instance id). */
  roomOwner: (roomId: string) => `rtc:room:${roomId}:owner`,
  roomPeers: (roomId: string) => `rtc:room:${roomId}:peers`,
  peer: (peerId: string) => `rtc:peer:${peerId}`,
  /** Optional cross-service fan-out (producer joined / left, etc.). */
  roomEventsChannel: (roomId: string) => `rtc:room:${roomId}:events`,
  /** Main API writes this when issuing an RTC JWT; must stay in sync with `user-active-rtc-room-redis.service`. */
  userActiveRtcRoom: (userId: string) => `user:active_rtc_room:${userId}`,
} as const;
