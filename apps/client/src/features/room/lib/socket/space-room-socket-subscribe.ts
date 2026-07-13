import type { Socket } from "socket.io-client";

import { SPACE_ROOM_SOCKET_EVENTS } from "@/features/room/types/socket/space-room-socket.types";

export function spaceRoomSocketEventName(
  key: keyof typeof SPACE_ROOM_SOCKET_EVENTS,
): string {
  return SPACE_ROOM_SOCKET_EVENTS[key];
}

export function subscribeSpaceRoomSocketEvents(
  socket: Socket,
  key: keyof typeof SPACE_ROOM_SOCKET_EVENTS,
  handler: (payload: unknown) => void,
): () => void {
  const event = spaceRoomSocketEventName(key);
  socket.on(event, handler);
  return () => {
    socket.off(event, handler);
  };
}
