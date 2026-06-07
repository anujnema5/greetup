export type SessionKind = "match" | "connection_call" | "circle";

const SESSION_KINDS: readonly SessionKind[] = ["match", "connection_call", "circle"];

type RoomWithSessionKind = {
  sessionKind?: unknown;
};

/** Parsed `sessionKind` when the API sent a known enum value. */
export function getSessionKind(room: RoomWithSessionKind | null | undefined): SessionKind | null {
  if (!room) return null;
  const sk = room.sessionKind;
  return typeof sk === "string" && SESSION_KINDS.includes(sk as SessionKind)
    ? (sk as SessionKind)
    : null;
}

export function isMatchSession(room: RoomWithSessionKind | null | undefined): boolean {
  return getSessionKind(room) === "match";
}

export function isConnectionCallSession(room: RoomWithSessionKind | null | undefined): boolean {
  return getSessionKind(room) === "connection_call";
}

export function isCircleSession(room: RoomWithSessionKind | null | undefined): boolean {
  return getSessionKind(room) === "circle";
}

/** Circle gallery / lobby layout — not “has a Postgres row”. */
export function isCircleGroupSession(
  room: RoomWithSessionKind | null | undefined,
  rtcRoomType?: string | null,
): boolean {
  return isCircleSession(room) || rtcRoomType === "circle";
}
