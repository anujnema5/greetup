export const Keys = {
  room: (roomId: string) => `rtc:room:${roomId}`,
  roomPeers: (roomId: string) => `rtc:room:${roomId}:peers`,
  peer: (peerId: string) => `rtc:peer:${peerId}`,
} as const;
