import type { types as MediasoupTypes } from "mediasoup";
import { env } from "@/shared/config/env";
import { RTC_CONFIG } from "@/shared/constants";
import { createRouter } from "@/core/mediasoup/mediasoup.service";
import { getRedis } from "@/core/redis/client";
import { RTC_ROOM_METADATA_TTL_SECONDS } from "@/core/redis/constants";
import { Keys } from "@/core/redis/keys";

export type LocalRoom = {
  roomId: string;
  router: MediasoupTypes.Router;
  audioLevelObserver: MediasoupTypes.AudioLevelObserver;
  dominantSpeakerListenerAttached: boolean;
};

const localRooms = new Map<string, LocalRoom>();

export type WrongInstanceError = {
  ok: false;
  code: "WRONG_INSTANCE";
  ownerInstanceId: string;
};

export type LocalRoomResult = { ok: true; room: LocalRoom } | WrongInstanceError;

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
    const claimed = await redis.set(ownerKey, instanceId, "EX", RTC_ROOM_METADATA_TTL_SECONDS, "NX");
    if (claimed !== "OK") {
      owner = await redis.get(ownerKey);
      if (owner && owner !== instanceId) {
        return { ok: false, code: "WRONG_INSTANCE", ownerInstanceId: owner };
      }
    }
  }

  const router = await createRouter();
  const al = RTC_CONFIG.audioLevelDominantSpeaker;
  const audioLevelObserver = await router.createAudioLevelObserver({
    maxEntries: al.maxEntries,
    threshold: al.threshold,
    interval: al.interval,
  });
  const room: LocalRoom = {
    roomId,
    router,
    audioLevelObserver,
    dominantSpeakerListenerAttached: false,
  };
  localRooms.set(roomId, room);

  const now = Date.now();
  const prevCreated = await redis.hget(Keys.room(roomId), "createdAt");
  const createdAtIso = prevCreated ?? new Date(now).toISOString();
  const roomKey = Keys.room(roomId);
  const pipe = redis.pipeline();
  pipe.hset(roomKey, "routerId", router.id);
  pipe.hset(roomKey, "ownerInstanceId", instanceId);
  pipe.hset(roomKey, "updatedAt", String(now));
  pipe.hset(roomKey, "createdAt", createdAtIso);
  await pipe.exec();
  await redis.expire(roomKey, RTC_ROOM_METADATA_TTL_SECONDS);

  return { ok: true, room };
}

export async function releaseRoom(roomId: string): Promise<void> {
  const redis = getRedis();
  const ownerKey = Keys.roomOwner(roomId);
  const owner = await redis.get(ownerKey);
  if (owner === env.rtcInstanceId) {
    await redis.del(ownerKey, Keys.room(roomId), Keys.roomPeers(roomId));
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
