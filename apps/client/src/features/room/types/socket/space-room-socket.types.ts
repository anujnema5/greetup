/**
 * Socket.IO events for DB-backed space rooms (global namespace; server emits).
 */
export const SPACE_ROOM_SOCKET_EVENTS = {
  hostEndedForEveryone: "space:host_ended_for_everyone",
  participantRemoved: "space:participant_removed",
  titleUpdated: "space:title_updated",
  openedForJoin: "space:opened_for_join",
} as const;

export type SpaceHostEndedForEveryonePayload = {
  roomId: string;
};

export function parseSpaceHostEndedForEveryonePayload(
  raw: unknown,
): SpaceHostEndedForEveryonePayload | null {
  if (!raw || typeof raw !== "object") return null;
  const roomId = (raw as { roomId?: unknown }).roomId;
  return typeof roomId === "string" && roomId.length > 0 ? { roomId } : null;
}

export type SpaceParticipantRemovedReason = "host_removed" | "nsfw";

export type SpaceParticipantRemovedPayload = {
  roomId: string;
  reason?: SpaceParticipantRemovedReason;
  strikeCount?: number;
};

export function parseSpaceParticipantRemovedPayload(
  raw: unknown,
): SpaceParticipantRemovedPayload | null {
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

export type SpaceTitleUpdatedPayload = {
  roomId: string;
  title: string;
};

export function parseSpaceTitleUpdatedPayload(raw: unknown): SpaceTitleUpdatedPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const { roomId, title } = raw as { roomId?: unknown; title?: unknown };
  if (typeof roomId !== "string" || roomId.length === 0) return null;
  if (typeof title !== "string" || title.trim().length === 0) return null;
  return { roomId, title: title.trim() };
}

export type SpaceOpenedForJoinPayload = {
  roomId: string;
};

export function parseSpaceOpenedForJoinPayload(raw: unknown): SpaceOpenedForJoinPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const roomId = (raw as { roomId?: unknown }).roomId;
  return typeof roomId === "string" && roomId.length > 0 ? { roomId } : null;
}
