import logger from "@/core/logging";
import { getRedis } from "@/core/redis";

/** Main API: last room an RTC JWT was issued for (not the same as `room_participants`). */
const activeRtcRoomKey = (userId: string) => `user:active_rtc_room:${userId}`;

/** Must match rtc-service `Keys.roomPeers(roomId)` — SFU membership set. */
const rtcRoomPeersRedisKey = (roomId: string) => `rtc:room:${roomId}:peers`;

const ACTIVE_RTC_ROOM_TTL_SEC = 4 * 60 * 60;

export async function setUserActiveRtcRoom(userId: string, roomId: string): Promise<void> {
  try {
    await getRedis().set(activeRtcRoomKey(userId), roomId, "EX", ACTIVE_RTC_ROOM_TTL_SEC);
  } catch (err) {
    logger.warn("setUserActiveRtcRoom failed", { userId, err: String(err) });
  }
}

export async function getUserActiveRtcRoomId(userId: string): Promise<string | null> {
  try {
    const id = await getRedis().get(activeRtcRoomKey(userId));
    return typeof id === "string" && id.length > 0 ? id : null;
  } catch (err) {
    logger.warn("getUserActiveRtcRoomId failed", { userId, err: String(err) });
    return null;
  }
}

export async function clearUserActiveRtcRoom(userId: string): Promise<void> {
  try {
    await getRedis().del(activeRtcRoomKey(userId));
  } catch (err) {
    logger.warn("clearUserActiveRtcRoom failed", { userId, err: String(err) });
  }
}

/**
 * For each user: `user:active_rtc_room` must match SFU membership in `rtc:room:{roomId}:peers`.
 * Stale token keys are removed when the SFU peer set is gone or empty (room fully torn down).
 */
export async function getUsersActiveRtcRooms(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const redis = getRedis();
  const byToken = await readActiveRoomIdsFromTokenKeys(redis, userIds);
  if (byToken.size === 0) {
    return new Map();
  }

  const entries = [...byToken.entries()];
  const inSfu = await readSfuMembershipFlags(redis, entries);
  const verified = new Map<string, string>();
  const notInSfu: { userId: string; roomId: string }[] = [];

  for (let i = 0; i < entries.length; i += 1) {
    const [userId, roomId] = entries[i]!;
    if (redisTruthy(inSfu[i])) {
      verified.set(userId, roomId);
    } else {
      notInSfu.push({ userId, roomId });
    }
  }

  if (notInSfu.length > 0) {
    await deleteStaleTokenKeysWhenRoomIsDead(redis, notInSfu);
  }

  return verified;
}

// ── ioredis pipeline helpers (exec rows are [err, result] tuples) ─────────────

function pipelineValue<T>(rows: unknown[][] | null | undefined, index: number): T | null {
  const row = rows?.[index];
  return Array.isArray(row) ? (row[1] as T) : null;
}

function redisTruthy(val: unknown): boolean {
  return val === 1 || val === true || val === "1";
}

async function readActiveRoomIdsFromTokenKeys(
  redis: ReturnType<typeof getRedis>,
  userIds: string[],
): Promise<Map<string, string>> {
  const pipe = redis.pipeline();
  for (const id of userIds) {
    pipe.get(activeRtcRoomKey(id));
  }
  const rows = await pipe.exec();
  const out = new Map<string, string>();
  userIds.forEach((id, i) => {
    const val = pipelineValue<string | null>(rows, i);
    if (typeof val === "string" && val.length > 0) {
      out.set(id, val);
    }
  });
  return out;
}

async function readSfuMembershipFlags(
  redis: ReturnType<typeof getRedis>,
  entries: [string, string][],
): Promise<unknown[]> {
  const pipe = redis.pipeline();
  for (const [userId, roomId] of entries) {
    pipe.sismember(rtcRoomPeersRedisKey(roomId), userId);
  }
  const rows = await pipe.exec();
  return entries.map((_, i) => pipelineValue(rows, i));
}

async function deleteStaleTokenKeysWhenRoomIsDead(
  redis: ReturnType<typeof getRedis>,
  notInSfu: { userId: string; roomId: string }[],
): Promise<void> {
  const uniqueRoomIds = [...new Set(notInSfu.map((s) => s.roomId))];
  const metaPipe = redis.pipeline();
  for (const roomId of uniqueRoomIds) {
    metaPipe.exists(rtcRoomPeersRedisKey(roomId));
    metaPipe.scard(rtcRoomPeersRedisKey(roomId));
  }
  const metaRows = await metaPipe.exec();

  const roomIsDead = new Map<string, boolean>();
  uniqueRoomIds.forEach((roomId, i) => {
    const existsVal = pipelineValue<number>(metaRows, i * 2);
    const scardVal = pipelineValue<number>(metaRows, i * 2 + 1);
    const exists = existsVal === 1;
    const count = typeof scardVal === "number" ? scardVal : 0;
    roomIsDead.set(roomId, !exists || count === 0);
  });

  const keysToDel: string[] = [];
  for (const { userId, roomId } of notInSfu) {
    if (roomIsDead.get(roomId) === true) {
      keysToDel.push(activeRtcRoomKey(userId));
    }
  }

  if (keysToDel.length === 0) {
    return;
  }

  try {
    await redis.del(...keysToDel);
  } catch (err) {
    logger.warn("getUsersActiveRtcRooms: failed to delete stale token keys", { err: String(err) });
  }
}
