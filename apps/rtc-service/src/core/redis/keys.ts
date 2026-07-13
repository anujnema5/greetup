export const Keys = {
  room: (roomId: string) => `rtc:room:${roomId}`,
  roomOwner: (roomId: string) => `rtc:room:${roomId}:owner`,
  roomPeers: (roomId: string) => `rtc:room:${roomId}:peers`,
  peer: (peerId: string) => `rtc:peer:${peerId}`,
  roomEventsChannel: (roomId: string) => `rtc:room:${roomId}:events`,
  userActiveRtcRoom: (userId: string) => `user:active_rtc_room:${userId}`,
} as const;
