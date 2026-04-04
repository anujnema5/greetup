import { getRedis } from "@/redis/client";
import { Keys } from "@/redis/keys";
import type { RoomRecord } from "@/rooms/room.types";

export async function getRoomRecord(roomId: string): Promise<RoomRecord | null> {
  const redis = getRedis();
  const h = await redis.hgetall(Keys.room(roomId));
  if (!h || Object.keys(h).length === 0) return null;

  return {
    id: roomId,
    createdAt: h.createdAt ?? "",
    routerId: h.routerId,
    ownerInstanceId: h.ownerInstanceId,
    updatedAt: h.updatedAt,
  };
}
