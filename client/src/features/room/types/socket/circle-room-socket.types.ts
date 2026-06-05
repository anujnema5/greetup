/**
 * Socket.IO events for DB-backed circle rooms (global namespace; server emits).
 */
export const CIRCLE_ROOM_SOCKET_EVENTS = {
  hostEndedForEveryone: "circle:host_ended_for_everyone",
  participantRemoved: "circle:participant_removed",
  titleUpdated: "circle:title_updated",
  openedForJoin: "circle:opened_for_join",
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

export type CircleParticipantRemovedReason = "host_removed" | "nsfw";

export type CircleParticipantRemovedPayload = {
  roomId: string;
  reason?: CircleParticipantRemovedReason;
  strikeCount?: number;
};

export function parseCircleParticipantRemovedPayload(
  raw: unknown,
): CircleParticipantRemovedPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const { roomId, reason, strikeCount } = raw as {
    roomId?: unknown;
    reason?: unknown;
    strikeCount?: unknown;
  };
  if (typeof roomId !== "string" || roomId.length === 0) return null;
  const parsedReason =
    reason === "host_removed" || reason === "nsfw" ? reason : undefined;
  const parsedStrike =
    typeof strikeCount === "number" && Number.isFinite(strikeCount)
      ? strikeCount
      : undefined;
  return {
    roomId,
    ...(parsedReason ? { reason: parsedReason } : {}),
    ...(parsedStrike != null ? { strikeCount: parsedStrike } : {}),
  };
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

export type CircleOpenedForJoinPayload = {
  roomId: string;
};

export function parseCircleOpenedForJoinPayload(raw: unknown): CircleOpenedForJoinPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const roomId = (raw as { roomId?: unknown }).roomId;
  return typeof roomId === "string" && roomId.length > 0 ? { roomId } : null;
}
