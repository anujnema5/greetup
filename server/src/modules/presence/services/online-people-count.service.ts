import logger from "@/core/logging";
import { getRedis } from "@/core/redis";
import { USER_PRESENCE_KEYS } from "@/core/redis/keys";

/** Other users currently online (excludes the signed-in viewer). */
export async function onlinePeopleCountForUser(viewerUserId: string): Promise<number> {
  const redis = getRedis();
  const total = await redis.scard(USER_PRESENCE_KEYS.ONLINE_USERS_SET);
  if (total <= 0) return 0;

  const viewerIsOnline =
    (await redis.sismember(USER_PRESENCE_KEYS.ONLINE_USERS_SET, viewerUserId)) === 1;
  const count = viewerIsOnline ? total - 1 : total;
  const onlinePeopleCount = Math.max(0, count);

  logger.debug("online_people_count_resolved", {
    viewerUserId,
    totalOnlineUsers: total,
    onlinePeopleCount,
  });

  return onlinePeopleCount;
}
