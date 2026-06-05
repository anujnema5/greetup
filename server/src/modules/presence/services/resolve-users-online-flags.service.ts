import { getRedis } from "@/core/redis";
import { USER_PRESENCE_KEYS } from "@/core/redis/keys";

/** Batch socket-presence check for many user ids (Redis `SISMEMBER` pipeline). */
export async function resolveUsersOnlineFlags(
  userIds: string[],
): Promise<Map<string, boolean>> {
  const out = new Map<string, boolean>();
  const unique = [...new Set(userIds.filter((id) => id.length > 0))];
  if (unique.length === 0) return out;

  const redis = getRedis();
  const pipe = redis.pipeline();
  for (const id of unique) {
    pipe.sismember(USER_PRESENCE_KEYS.ONLINE_USERS_SET, id);
  }
  const rows = await pipe.exec();

  unique.forEach((id, i) => {
    const raw = rows?.[i]?.[1];
    out.set(id, raw === 1);
  });

  return out;
}
