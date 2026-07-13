import { getApiErrorCode, getApiErrorMessage } from "@/lib/api/fetch-client";

const CLOSED_ROOM_JOIN_CODES = new Set(["ROOM_NOT_LIVE", "ROOM_EXPIRED"]);

/**
 * Join can fail harmlessly when the other peer already ended the room.
 * Do not show an error toast for those cases.
 */
export function shouldIgnoreClosedRoomJoin(error: unknown): boolean {
  const code = getApiErrorCode(error);
  if (code && CLOSED_ROOM_JOIN_CODES.has(code)) return true;
  const message = getApiErrorMessage(error, "");
  return /not live yet/i.test(message);
}
