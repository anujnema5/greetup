import type { RoomSessionType } from "@/shared/types/room-session";
import { isGroupRoomSessionType } from "@/shared/types/room-session";
import {
  isSpaceGroupSession,
  isSpaceSession,
  isConnectionCallSession,
  isMatchSession,
} from "@/features/room/lib/session/room-session-kind";

export type { RoomSessionType };
export type SessionKind = "match" | "connection_call" | "space";

/** Random match 1:1 (Redis pair or expanded in place). */
export type MatchRoomData = {
  sessionKind: "match";
  roomId: string;
  userA: string;
  userB: string;
  matchScore: string | null;
  userAName?: string | null;
  userBName?: string | null;
  /** After an in-place 1:1 → space expansion, Postgres `room_type` is `space`. */
  roomType?: RoomSessionType;
  title?: string;
  hostUserId?: string;
  startedAt?: string | null;
  expiresAt?: string | null;
  /** Open-to-connect connect-request call — do not rematch when the peer leaves. */
  openToConnectOrigin?: boolean;
};

/** Connection DM call (`room_type = direct`, `session_kind = connection_call`). */
export type ConnectionCallRoomData = {
  sessionKind: "connection_call";
  roomId: string;
  hostUserId: string;
  roomType: "direct";
  title: string;
  conversationId?: string;
  lobbyGateActive?: "0" | "1";
  startedAt?: string | null;
  expiresAt?: string | null;
};

/** Hosted / scheduled space (`session_kind = space`). */
export type SpaceRoomData = {
  sessionKind: "space";
  roomId: string;
  hostUserId: string;
  roomType: RoomSessionType | string;
  title: string;
  status?: string;
  lobbyGateActive?: "0" | "1";
  scheduledStartAt?: string;
  startedAt?: string | null;
  expiresAt?: string | null;
};

/**
 * Room document from GET `/room/:roomId` (match pair, connection call, or space).
 */
export type RoomData = MatchRoomData | ConnectionCallRoomData | SpaceRoomData;

function parseRoomSessionType(raw: unknown): RoomSessionType | undefined {
  if (raw === "direct") return "direct";
  if (raw === "space") return "space";
  return undefined;
}

function parseTimingFields(d: Record<string, unknown>) {
  const startedAt =
    typeof d.startedAt === "string" && d.startedAt.length > 0 ? d.startedAt : null;
  const expiresAt =
    typeof d.expiresAt === "string" && d.expiresAt.length > 0 ? d.expiresAt : null;
  return {
    ...(startedAt ? { startedAt } : {}),
    ...(expiresAt ? { expiresAt } : {}),
  };
}

function parseSpaceSessionKindPayload(d: Record<string, unknown>): SpaceRoomData {
  const roomType = parseRoomSessionType(d.roomType);
  const lobbyRaw = d.lobbyGateActive;
  const lobbyGateActive: "0" | "1" | undefined =
    lobbyRaw === "0" || lobbyRaw === "1" ? lobbyRaw : undefined;
  const schedRaw = d.scheduledStartAt;
  const scheduledStartAt =
    typeof schedRaw === "string" && schedRaw.length > 0 ? schedRaw : undefined;
  const statusRaw = d.status;
  const status =
    typeof statusRaw === "string" && statusRaw.length > 0 ? statusRaw : undefined;

  return {
    sessionKind: "space",
    roomId: String(d.roomId),
    hostUserId: String(d.hostUserId),
    roomType: roomType ?? (typeof d.roomType === "string" ? d.roomType : "space"),
    title: String(d.title),
    ...(status ? { status } : {}),
    ...(lobbyGateActive ? { lobbyGateActive } : {}),
    ...(scheduledStartAt ? { scheduledStartAt } : {}),
    ...parseTimingFields(d),
  };
}

/** Parses API `data` envelope for room responses. */
export function parseRoomData(data: unknown): RoomData {
  if (!data || typeof data !== "object") {
    throw new Error("Unexpected room payload");
  }
  const d = data as Record<string, unknown>;

  if (d.sessionKind === "connection_call") {
    const conversationId =
      typeof d.conversationId === "string" && d.conversationId.length > 0
        ? d.conversationId
        : undefined;
    const lobbyRaw = d.lobbyGateActive;
    const lobbyGateActive: "0" | "1" | undefined =
      lobbyRaw === "0" || lobbyRaw === "1" ? lobbyRaw : undefined;
    return {
      sessionKind: "connection_call",
      roomId: String(d.roomId),
      hostUserId: String(d.hostUserId),
      roomType: "direct",
      title: typeof d.title === "string" && d.title.length > 0 ? d.title : "Call",
      ...(conversationId ? { conversationId } : {}),
      ...(lobbyGateActive ? { lobbyGateActive } : {}),
      ...parseTimingFields(d),
    };
  }

  if (d.sessionKind === "space") {
    return parseSpaceSessionKindPayload(d);
  }

  if (d.sessionKind === "match" || ("userA" in d && "userB" in d && "roomId" in d)) {
    const ms = d.matchScore;
    const rt = d.roomType;
    const title = d.title;
    const hostUserId = d.hostUserId;
    const roomType =
      rt === "space" || rt === "direct" ? parseRoomSessionType(rt) : undefined;
    const openToConnectOrigin = d.openToConnectOrigin === true;
    return {
      sessionKind: "match",
      roomId: String(d.roomId),
      userA: String(d.userA),
      userB: String(d.userB),
      matchScore: ms == null ? null : typeof ms === "string" ? ms : String(ms),
      userAName: typeof d.userAName === "string" ? d.userAName : null,
      userBName: typeof d.userBName === "string" ? d.userBName : null,
      roomType,
      title: typeof title === "string" ? title : undefined,
      hostUserId: typeof hostUserId === "string" ? hostUserId : undefined,
      ...(openToConnectOrigin ? { openToConnectOrigin: true } : {}),
      ...parseTimingFields(d),
    };
  }

  throw new Error("Unexpected room payload");
}

/** Postgres-backed space session (`sessionKind === 'space'`). */
export function isSpaceRoomData(
  room: RoomData | null | undefined,
): room is SpaceRoomData {
  return isSpaceSession(room);
}

/** Redis / API match-pair 1:1 room. */
export function isDirectMatchRoom(room: RoomData | null | undefined): room is MatchRoomData {
  if (!room) return false;
  return isMatchSession(room) || ("userA" in room && !isSpaceSession(room) && !isConnectionCallSession(room));
}

/** Use space (gallery) layout when the session is a group room. */
export function isRoomGroupLayout(
  room: RoomData | null | undefined,
  rtcRoomType: RoomSessionType | null | undefined,
): boolean {
  if (isSpaceGroupSession(room, rtcRoomType)) return true;
  if (room && "userA" in room && isGroupRoomSessionType(room.roomType)) return true;
  return false;
}

/**
 * Postgres-backed space session: native `space` **or** a 1:1 match
 * promoted in place (`room_type = space`, same `roomId`).
 */
export function isPersistedSpaceSession(
  room: RoomData | null | undefined,
  rtcRoomType: RoomSessionType | null | undefined,
): boolean {
  if (isGroupRoomSessionType(rtcRoomType)) return true;
  if (room && isSpaceRoomData(room) && isGroupRoomSessionType(room.roomType)) return true;
  if (room && "userA" in room && isGroupRoomSessionType(room.roomType)) return true;
  return false;
}

/** `rooms.host_user_id` from GET `/room/:id` (space or expanded match payload). */
export function resolveSpaceHostUserId(
  room: RoomData | null | undefined,
): string | null {
  if (!room) return null;
  if (isSpaceRoomData(room)) return room.hostUserId;
  if ("hostUserId" in room && typeof room.hostUserId === "string" && room.hostUserId.length > 0) {
    return room.hostUserId;
  }
  return null;
}

export function isSpaceHostUser(
  room: RoomData | null | undefined,
  userId: string | null | undefined,
  rtcRoomType: RoomSessionType | null | undefined,
): boolean {
  if (!userId || !isPersistedSpaceSession(room, rtcRoomType)) return false;
  const hostId = resolveSpaceHostUserId(room);
  return Boolean(hostId && hostId === userId);
}

/**
 * RTC credential fields returned by `useRoom`.
 * Derived from RTC token query + room gating.
 */
export type RoomRtcState = {
  rtcToken: string | null;
  rtcTokenExpiresInSec: number | null;
  rtcTokenLoading: boolean;
  rtcTokenError: string | null;
  rtcTokenSkipped: boolean;
};
