import { getRedis } from "@/core/redis";
import { ROOM_KEYS, ROOM_TTL } from "@/core/redis/keys";
import logger from "@/core/logging";
import type { RoomSessionType } from "@/shared/types/room-session";

export type DbSessionRoomRedisPayload = {
  roomId: string;
  hostUserId: string;
  roomType: RoomSessionType;
  title: string;
};

/**
 * Provisions ephemeral Redis state for a DB-backed room when the session is live.
 * Key aligns with Postgres `rooms.id` so clients use one id for API + realtime.
 * Idempotent: refreshes TTL if the key already exists with the same session kind.
 */
export async function provisionSessionRoomRedis(
  payload: DbSessionRoomRedisPayload,
): Promise<void> {
  const redis = getRedis();
  const key = `${ROOM_KEYS.ROOM}${payload.roomId}`;

  await redis.hset(key, {
    sessionKind: "db_room",
    roomId: payload.roomId,
    hostUserId: payload.hostUserId,
    roomType: payload.roomType,
    title: payload.title,
    createdAt: String(Date.now()),
  });
  await redis.expire(key, ROOM_TTL);

  logger.info("Session room provisioned in Redis", {
    roomId: payload.roomId,
    roomType: payload.roomType,
  });
}

/** Updates `roomType` on an existing session-room hash (no-op if key missing). */
export async function patchSessionRoomRedisRoomType(
  roomId: string,
  roomType: RoomSessionType,
): Promise<void> {
  const redis = getRedis();
  const key = `${ROOM_KEYS.ROOM}${roomId}`;
  const exists = await redis.exists(key);
  if (!exists) return;
  await redis.hset(key, { roomType });
  await redis.expire(key, ROOM_TTL);
}
