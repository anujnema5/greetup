import logger from "@/core/logging";
import { getRedis } from "@/core/redis";

/** Redis key: user currently holding a fresh RTC token / expected to be in SFU (not historical `room_participants`). */
const activeRtcRoomKey = (userId: string) => `user:active_rtc_room:${userId}`;

/** Refreshed on every successful RTC token issue; invite / “in a call” UI reads this instead of stale Postgres rows. */
const ACTIVE_RTC_ROOM_TTL_SEC = 4 * 60 * 60; // 4h — long calls + token refetch keeps it alive

export async function setUserActiveRtcRoom(userId: string, roomId: string): Promise<void> {
  try {
    await getRedis().set(activeRtcRoomKey(userId), roomId, "EX", ACTIVE_RTC_ROOM_TTL_SEC);
  } catch (err) {
    logger.warn("setUserActiveRtcRoom failed", { userId, err: String(err) });
  }
}

export async function clearUserActiveRtcRoom(userId: string): Promise<void> {
  try {
    await getRedis().del(activeRtcRoomKey(userId));
  } catch (err) {
    logger.warn("clearUserActiveRtcRoom failed", { userId, err: String(err) });
  }
}

export async function getUsersActiveRtcRooms(userIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (userIds.length === 0) return out;
  const redis = getRedis();
  const pipe = redis.pipeline();
  for (const id of userIds) {
    pipe.get(activeRtcRoomKey(id));
  }
  const raw = await pipe.exec();
  userIds.forEach((id, i) => {
    const tuple = raw?.[i];
    const val = Array.isArray(tuple) ? tuple[1] : tuple;
    if (typeof val === "string" && val.length > 0) {
      out.set(id, val);
    }
  });
  return out;
}
