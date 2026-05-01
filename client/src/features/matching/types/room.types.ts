import type { RoomSessionType } from "@/shared/types/room-session";

export type { RoomSessionType };

/**
 * Room document from GET `/room/:roomId` (match engine Redis pair or DB-backed room).
 */
export type RoomData =
  | {
      sessionKind?: undefined;
      roomId: string;
      userA: string;
      userB: string;
      matchScore: string | null;
      userAName?: string | null;
      userBName?: string | null;
      /** After an in-place 1:1 → circle expansion, Postgres `room_type` is `circle`. */
      roomType?: RoomSessionType;
      /** Present when expanded circle: DB `rooms.title`. */
      title?: string;
      /** Present when expanded circle: DB `rooms.host_user_id`. */
      hostUserId?: string;
    }
  | {
      sessionKind: "db_room";
      roomId: string;
      hostUserId: string;
      /** API may send other strings; callers treat unknown values defensively. */
      roomType: RoomSessionType | string;
      title: string;
    };

/** Parses API `data` envelope — used by RTK Query `transformResponse`. */
export function parseRoomData(data: unknown): RoomData {
  if (!data || typeof data !== "object") {
    throw new Error("Unexpected room payload");
  }
  const d = data as Record<string, unknown>;
  if (d.sessionKind === "db_room") {
    const rtRaw = d.roomType;
    const roomType: RoomSessionType | string =
      rtRaw === "circle" || rtRaw === "direct" ? rtRaw : String(rtRaw);
    return {
      sessionKind: "db_room",
      roomId: String(d.roomId),
      hostUserId: String(d.hostUserId),
      roomType,
      title: String(d.title),
    };
  }
  if ("userA" in d && "userB" in d && "roomId" in d) {
    const ms = d.matchScore;
    const rt = d.roomType;
    const title = d.title;
    const hostUserId = d.hostUserId;
    return {
      roomId: String(d.roomId),
      userA: String(d.userA),
      userB: String(d.userB),
      matchScore: ms == null ? null : typeof ms === "string" ? ms : String(ms),
      userAName: typeof d.userAName === "string" ? d.userAName : null,
      userBName: typeof d.userBName === "string" ? d.userBName : null,
      roomType: rt === "circle" || rt === "direct" ? rt : undefined,
      title: typeof title === "string" ? title : undefined,
      hostUserId: typeof hostUserId === "string" ? hostUserId : undefined,
    };
  }
  throw new Error("Unexpected room payload");
}

/** DB-backed circle / group room (`GET /room/:id`). */
export function isCircleRoomData(
  room: RoomData | null | undefined,
): room is Extract<RoomData, { sessionKind: "db_room" }> {
  return Boolean(room && "sessionKind" in room && room.sessionKind === "db_room");
}

/** Redis match-pair (1:1) room — not a circle. */
export function isDirectMatchRoom(room: RoomData | null | undefined): boolean {
  return Boolean(room && !isCircleRoomData(room));
}

/** Use circle (gallery) layout when the DB/RTC session is a group room. */
export function isRoomGroupLayout(
  room: RoomData | null | undefined,
  rtcRoomType: RoomSessionType | null | undefined,
): boolean {
  if (rtcRoomType === "circle") return true;
  if (room && isCircleRoomData(room)) return true;
  if (room && "userA" in room && room.roomType === "circle") return true;
  return false;
}

/**
 * RTC credential fields returned by `useRoom`.
 * Derived from `getRtcToken` (RTK Query) + room gating.
 */
export type RoomRtcState = {
  rtcToken: string | null;
  rtcTokenExpiresInSec: number | null;
  rtcTokenLoading: boolean;
  rtcTokenError: string | null;
  rtcTokenSkipped: boolean;
};
