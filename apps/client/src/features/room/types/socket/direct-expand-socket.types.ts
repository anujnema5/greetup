/**
 * Socket.IO events for 1:1 → space expansion (server emits; client listens globally).
 */
export const DIRECT_EXPAND_SOCKET_EVENTS = {
  invite: "room:direct_expand_invite",
  becameSpace: "room:became_space",
  declined: "room:direct_expand_declined",
} as const;

export type DirectExpandInvitePayload = {
  inviteId: string;
  roomId: string;
  inviterUserId: string;
  inviterDisplayName: string;
  roomTitle: string;
  currentParticipantNames: string[];
};

export function parseDirectExpandInvitePayload(raw: unknown): DirectExpandInvitePayload | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.inviteId !== "string" || typeof p.roomId !== "string") {
    return null;
  }
  const inviterDisplayName =
    typeof p.inviterDisplayName === "string" && p.inviterDisplayName.trim().length > 0
      ? p.inviterDisplayName
      : "Someone";
  return {
    inviteId: p.inviteId,
    roomId: p.roomId,
    inviterUserId: typeof p.inviterUserId === "string" ? p.inviterUserId : "",
    inviterDisplayName,
    roomTitle: typeof p.roomTitle === "string" ? p.roomTitle : "Call",
    currentParticipantNames: Array.isArray(p.currentParticipantNames)
      ? p.currentParticipantNames.filter((x): x is string => typeof x === "string")
      : [],
  };
}

export function parseBecameSpaceRoomId(raw: unknown): string | null {
  if (!raw || typeof raw !== "object" || !("roomId" in raw)) return null;
  const id = (raw as { roomId?: unknown }).roomId;
  return typeof id === "string" && id.length > 0 ? id : null;
}
