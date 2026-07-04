import { getRedis } from "@/core/redis";
import { ROOM_KEYS } from "@/core/redis/keys";

/** True when this direct room was created from an open-to-connect connect request. */
export async function isOtcCallRoom(roomId: string): Promise<boolean> {
  const redis = getRedis();
  const room = await redis.hgetall(`${ROOM_KEYS.ROOM}${roomId}`);
  return room?.openToConnectOrigin === "true";
}
