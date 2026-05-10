import { getRedis } from "@/core/redis/client";
import { Keys } from "@/core/redis/keys";
import type { RoomRecord } from "@/modules/rooms/room.types";

/** Kept for future room-introspection and admin tooling. */
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
