import { env } from "@/config/env";
import { getRedis } from "@/redis/client";
import { RTC_ROOM_METADATA_TTL_SECONDS } from "@/redis/constants";
import { Keys } from "@/redis/keys";
import type { PeerRecord } from "@/peers/peer.types";

export async function savePeer(record: PeerRecord): Promise<void> {
  const redis = getRedis();
  const key = Keys.peer(record.id);
  // One field per HSET — Redis <4 rejects multi-field `HSET k f1 v1 f2 v2` (ioredis object form).
  const pipe = redis.pipeline();
  pipe.hset(key, "roomId", record.roomId);
  pipe.hset(key, "joinedAt", record.joinedAt);
  pipe.hset(key, "rtcInstanceId", record.rtcInstanceId ?? env.rtcInstanceId);
  pipe.hset(key, "socketId", record.socketId ?? "");
  await pipe.exec();
  await redis.expire(key, RTC_ROOM_METADATA_TTL_SECONDS);
  await redis.sadd(Keys.roomPeers(record.roomId), record.id);
  await redis.expire(Keys.roomPeers(record.roomId), RTC_ROOM_METADATA_TTL_SECONDS);
}

export async function deletePeer(peerId: string, roomId: string): Promise<void> {
  const redis = getRedis();
  await redis.del(Keys.peer(peerId));
  await redis.srem(Keys.roomPeers(roomId), peerId);
}

export async function getPeer(peerId: string): Promise<PeerRecord | null> {
  const redis = getRedis();
  const h = await redis.hgetall(Keys.peer(peerId));
  if (!h || Object.keys(h).length === 0) return null;

  return {
    id: peerId,
    roomId: h.roomId ?? "",
    joinedAt: h.joinedAt ?? "",
    rtcInstanceId: h.rtcInstanceId,
    socketId: h.socketId ? h.socketId : undefined,
  };
}

export async function listPeerIdsInRoom(roomId: string): Promise<string[]> {
  return getRedis().smembers(Keys.roomPeers(roomId));
}

export type RoomMediaEvent =
  | { type: "producer_added"; roomId: string; peerId: string; producerId: string; kind: string }
  | { type: "producer_removed"; roomId: string; peerId: string; producerId: string };

export async function publishRoomMediaEvent(roomId: string, event: RoomMediaEvent): Promise<void> {
  await getRedis().publish(Keys.roomEventsChannel(roomId), JSON.stringify(event));
}
