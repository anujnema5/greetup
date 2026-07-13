import { getRedis } from "@/core/redis";
import { USER_PRESENCE_KEYS } from "@/core/redis/keys";
import { userPresenceHashKey } from "../lib/user-presence-key";

/**
 * Keep ids whose TTL'd presence hash still exists; drop the rest from `all_online_users`.
 * The set has no TTL — ghosts remain after a missed disconnect until something reconciles.
 */
export async function retainLiveOnlineUserIds(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];

  const redis = getRedis();
  const pipe = redis.pipeline();
  for (const id of userIds) {
    pipe.exists(userPresenceHashKey(id));
  }
  const rows = await pipe.exec();

  const live: string[] = [];
  const stale: string[] = [];
  for (let i = 0; i < userIds.length; i += 1) {
    const id = userIds[i];
    if (!id) continue;
    if (rows?.[i]?.[1] === 1) live.push(id);
    else stale.push(id);
  }
  if (stale.length > 0) {
    void redis.srem(USER_PRESENCE_KEYS.ONLINE_USERS_SET, ...stale);
  }
  return live;
}

export async function listLiveOnlineUserIds(): Promise<string[]> {
  const redis = getRedis();
  const members = await redis.smembers(USER_PRESENCE_KEYS.ONLINE_USERS_SET);
  return retainLiveOnlineUserIds(members);
}
