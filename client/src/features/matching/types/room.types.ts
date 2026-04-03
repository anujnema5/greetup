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
    }
  | {
      sessionKind: "db_room";
      roomId: string;
      hostUserId: string;
      roomType: string;
      title: string;
    };

/** Parses API `data` envelope — used by RTK Query `transformResponse`. */
export function parseRoomData(data: unknown): RoomData {
  if (!data || typeof data !== "object") {
    throw new Error("Unexpected room payload");
  }
  const d = data as Record<string, unknown>;
  if (d.sessionKind === "db_room") {
    return {
      sessionKind: "db_room",
      roomId: String(d.roomId),
      hostUserId: String(d.hostUserId),
      roomType: String(d.roomType),
      title: String(d.title),
    };
  }
  if ("userA" in d && "userB" in d && "roomId" in d) {
    const ms = d.matchScore;
    return {
      roomId: String(d.roomId),
      userA: String(d.userA),
      userB: String(d.userB),
      matchScore: ms == null ? null : typeof ms === "string" ? ms : String(ms),
    };
  }
  throw new Error("Unexpected room payload");
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
