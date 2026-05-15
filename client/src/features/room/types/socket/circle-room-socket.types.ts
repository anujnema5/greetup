/**
 * Socket.IO events for DB-backed circle rooms (global namespace; server emits).
 */
export const CIRCLE_ROOM_SOCKET_EVENTS = {
  hostEndedForEveryone: "circle:host_ended_for_everyone",
} as const;

export type CircleHostEndedForEveryonePayload = {
  roomId: string;
};

export function parseCircleHostEndedForEveryonePayload(
  raw: unknown,
): CircleHostEndedForEveryonePayload | null {
  if (!raw || typeof raw !== "object") return null;
  const roomId = (raw as { roomId?: unknown }).roomId;
  return typeof roomId === "string" && roomId.length > 0 ? { roomId } : null;
}
