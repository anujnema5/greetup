/**
 * Socket.IO events for DB-backed circle rooms (global namespace; server emits).
 */
export const CIRCLE_ROOM_SOCKET_EVENTS = {
  hostEndedForEveryone: "circle:host_ended_for_everyone",
  titleUpdated: "circle:title_updated",
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

export type CircleTitleUpdatedPayload = {
  roomId: string;
  title: string;
};

export function parseCircleTitleUpdatedPayload(raw: unknown): CircleTitleUpdatedPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const { roomId, title } = raw as { roomId?: unknown; title?: unknown };
  if (typeof roomId !== "string" || roomId.length === 0) return null;
  if (typeof title !== "string" || title.trim().length === 0) return null;
  return { roomId, title: title.trim() };
}
