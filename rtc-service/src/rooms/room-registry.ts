import type { types as MediasoupTypes } from "mediasoup";
import { env } from "@/config/env";
import { createRouter } from "@/mediasoup/mediasoup.service";
import { getRedis } from "@/redis/client";
import { Keys } from "@/redis/keys";

/** In-memory only: mediasoup Router cannot live in Redis. */
export type LocalRoom = {
  roomId: string;
  router: MediasoupTypes.Router;
};

const localRooms = new Map<string, LocalRoom>();

const ROOM_OWNER_TTL_SECONDS = 24 * 60 * 60;

export type WrongInstanceError = {
  ok: false;
  code: "WRONG_INSTANCE";
  ownerInstanceId: string;
};

export type LocalRoomResult = { ok: true; room: LocalRoom } | WrongInstanceError;

/**
 * Ensures this process has a Router for `roomId` if and only if Redis says we are the owner.
 * Other instances get `WRONG_INSTANCE` and must tell the client to connect to `ownerInstanceId`.
 */
export async function getOrCreateLocalRoom(roomId: string): Promise<LocalRoomResult> {
  const redis = getRedis();
  const ownerKey = Keys.roomOwner(roomId);
  const instanceId = env.rtcInstanceId;

  const cached = localRooms.get(roomId);
  if (cached) {
    const owner = await redis.get(ownerKey);
    if (owner === instanceId) return { ok: true, room: cached };
    await teardownLocalRoom(roomId);
  }

  let owner = await redis.get(ownerKey);

  if (owner && owner !== instanceId) {
    return { ok: false, code: "WRONG_INSTANCE", ownerInstanceId: owner };
  }

  if (!owner) {
    const claimed = await redis.set(ownerKey, instanceId, "EX", ROOM_OWNER_TTL_SECONDS, "NX");
    if (claimed !== "OK") {
      owner = await redis.get(ownerKey);
      if (owner && owner !== instanceId) {
        return { ok: false, code: "WRONG_INSTANCE", ownerInstanceId: owner };
      }
    }
  }

  const router = await createRouter();
  const room: LocalRoom = { roomId, router };
  localRooms.set(roomId, room);

  await redis.hset(Keys.room(roomId), {
    routerId: router.id,
    ownerInstanceId: instanceId,
    updatedAt: String(Date.now()),
  });
  await redis.expire(Keys.room(roomId), ROOM_OWNER_TTL_SECONDS);

  return { ok: true, room };
}

/** Call when this instance releases the room (last peer left) or on controlled shutdown. */
export async function releaseRoom(roomId: string): Promise<void> {
  const redis = getRedis();
  const ownerKey = Keys.roomOwner(roomId);
  const owner = await redis.get(ownerKey);
  if (owner === env.rtcInstanceId) {
    await redis.del(ownerKey);
  }
  await teardownLocalRoom(roomId);
}

async function teardownLocalRoom(roomId: string): Promise<void> {
  const existing = localRooms.get(roomId);
  if (existing) {
    existing.router.close();
    localRooms.delete(roomId);
  }
}

export function getLocalRoom(roomId: string): LocalRoom | undefined {
  return localRooms.get(roomId);
}
