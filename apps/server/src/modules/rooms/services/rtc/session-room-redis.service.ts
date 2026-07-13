import { getRedis } from "@/core/redis";
import { ROOM_KEYS, ROOM_TTL } from "@/core/redis/keys";
import logger from "@/core/logging";
import type { RoomSessionType } from "@/shared/types/room-session";

const sessionRoomKey = (roomId: string) => `${ROOM_KEYS.ROOM}${roomId}`;

export type SpaceSessionRoomRedisPayload = {
  roomId: string;
  hostUserId: string;
  roomType: RoomSessionType;
  title: string;
  /**
   * When true, non-hosts cannot obtain an RTC JWT until the host clears the gate
   * (`POST /room/:id/open-meeting`). The host always receives a token.
   */
  lobbyGateActive: boolean;
};

export type ConnectionCallSessionRoomRedisPayload = {
  roomId: string;
  hostUserId: string;
  title: string;
  conversationId: string;
};

/** Ephemeral `room:{id}` hash for a live space session (idempotent). */
export async function provisionSessionRoomRedis(
  payload: SpaceSessionRoomRedisPayload,
): Promise<void> {
  const redis = getRedis();
  const key = sessionRoomKey(payload.roomId);

  await redis.hset(key, {
    sessionKind: "space",
    roomId: payload.roomId,
    hostUserId: payload.hostUserId,
    roomType: payload.roomType,
    title: payload.title,
    createdAt: String(Date.now()),
    lobbyGateActive: payload.lobbyGateActive ? "1" : "0",
  });
  await redis.expire(key, ROOM_TTL);

  logger.info("Session room provisioned in Redis", {
    roomId: payload.roomId,
    roomType: payload.roomType,
    sessionKind: "space",
  });
}

/** Ephemeral `room:{id}` hash for a live connection (DM) call. */
export async function provisionConnectionCallSessionRoomRedis(
  payload: ConnectionCallSessionRoomRedisPayload,
): Promise<void> {
  const redis = getRedis();
  const key = sessionRoomKey(payload.roomId);

  await redis.hset(key, {
    sessionKind: "connection_call",
    roomId: payload.roomId,
    hostUserId: payload.hostUserId,
    roomType: "direct",
    title: payload.title,
    conversationId: payload.conversationId,
    createdAt: String(Date.now()),
    lobbyGateActive: "0",
  });
  await redis.expire(key, ROOM_TTL);

  logger.info("Connection call session room provisioned in Redis", {
    roomId: payload.roomId,
    sessionKind: "connection_call",
  });
}

export async function patchSessionRoomRedisRoomType(
  roomId: string,
  roomType: RoomSessionType,
): Promise<void> {
  const redis = getRedis();
  const key = sessionRoomKey(roomId);
  const exists = await redis.exists(key);
  if (!exists) return;
  await redis.hset(key, { roomType });
  await redis.expire(key, ROOM_TTL);
}

/** After match → space expand: align Redis with Postgres `session_kind` / `room_type`. */
export async function patchSessionRoomRedisSpaceExpand(roomId: string): Promise<void> {
  const redis = getRedis();
  const key = sessionRoomKey(roomId);
  const exists = await redis.exists(key);
  if (!exists) return;
  await redis.hset(key, { roomType: "space", sessionKind: "space" });
  await redis.expire(key, ROOM_TTL);
}

export async function patchSessionRoomRedisTitle(roomId: string, title: string): Promise<void> {
  const redis = getRedis();
  const key = sessionRoomKey(roomId);
  const exists = await redis.exists(key);
  if (!exists) return;
  await redis.hset(key, { title });
  await redis.expire(key, ROOM_TTL);
}

/** Host opens the space to all participants (clears lobby RTC gate). */
export async function clearSpaceLobbyGateInRedis(roomId: string): Promise<boolean> {
  const redis = getRedis();
  const key = sessionRoomKey(roomId);
  const exists = await redis.exists(key);
  if (!exists) return false;
  await redis.hset(key, { lobbyGateActive: "0" });
  await redis.expire(key, ROOM_TTL);
  return true;
}

export async function deleteSessionRoomRedis(roomId: string): Promise<void> {
  const redis = getRedis();
  const key = sessionRoomKey(roomId);
  try {
    await redis.del(key);
    logger.debug("Session room Redis key removed", { roomId });
  } catch (err) {
    logger.warn("deleteSessionRoomRedis failed", { roomId, err: String(err) });
  }
}

export async function deleteSessionRoomRedisMany(roomIds: readonly string[]): Promise<void> {
  if (roomIds.length === 0) return;
  const redis = getRedis();
  const keys = roomIds.map(sessionRoomKey);
  try {
    await redis.del(...keys);
    logger.debug("Session room Redis keys removed (batch)", { count: keys.length });
  } catch (err) {
    logger.warn("deleteSessionRoomRedisMany failed", { count: keys.length, err: String(err) });
  }
}
