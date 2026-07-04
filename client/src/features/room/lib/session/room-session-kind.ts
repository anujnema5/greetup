import { isGroupRoomSessionType } from "@/shared/types/room-session";

export type SessionKind = "match" | "connection_call" | "space";

const SESSION_KINDS: readonly SessionKind[] = ["match", "connection_call", "space"];

type RoomWithSessionKind = {
  sessionKind?: unknown;
};

function isKnownSessionKind(sk: unknown): sk is SessionKind {
  return typeof sk === "string" && SESSION_KINDS.includes(sk as SessionKind);
}

export function getSessionKind(room: RoomWithSessionKind | null | undefined): SessionKind | null {
  if (!room) return null;
  const sk = room.sessionKind;
  return isKnownSessionKind(sk) ? sk : null;
}

export function isMatchSession(room: RoomWithSessionKind | null | undefined): boolean {
  return getSessionKind(room) === "match";
}

type RoomWithOpenToConnectOrigin = RoomWithSessionKind & {
  openToConnectOrigin?: unknown;
};

/** Open-to-connect 1:1 call — match sessionKind but must not rematch on peer leave. */
export function isOpenToConnectMatchSession(
  room: RoomWithOpenToConnectOrigin | null | undefined,
): boolean {
  if (!isMatchSession(room)) return false;
  return room?.openToConnectOrigin === true;
}

export function isConnectionCallSession(room: RoomWithSessionKind | null | undefined): boolean {
  return getSessionKind(room) === "connection_call";
}

export function isSpaceSession(room: RoomWithSessionKind | null | undefined): boolean {
  return getSessionKind(room) === "space";
}

/** Space gallery / lobby layout — not “has a Postgres row”. */
export function isSpaceGroupSession(
  room: RoomWithSessionKind | null | undefined,
  rtcRoomType?: string | null,
): boolean {
  return isSpaceSession(room) || isGroupRoomSessionType(rtcRoomType);
}
