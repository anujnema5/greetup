import { getRedis } from "@/core/redis";
import {
  OPEN_TO_CONNECT_KEYS,
  OPEN_TO_CONNECT_USER_TTL_SEC,
  USER_PRESENCE_KEYS,
} from "@/core/redis/keys";
import type { OpenToConnectTags } from "../types";

function parseActivityIdsFromHash(raw: string | null | undefined): string[] {
  if (!raw || raw.trim() === "") return [];
  return raw.split(",").map((id) => id.trim()).filter(Boolean);
}

export const otcRedisIndexService = {
  async isUserOnline(userId: string): Promise<boolean> {
    const redis = getRedis();
    const result = await redis.sismember(USER_PRESENCE_KEYS.ONLINE_USERS_SET, userId);
    return result === 1;
  },

  async syncUserToIndex(tags: OpenToConnectTags): Promise<void> {
    const redis = getRedis();
    const userKey = OPEN_TO_CONNECT_KEYS.user(tags.userId);
    const activityIds = [...new Set(tags.activityIds)];

    const multi = redis.multi();
    multi.sadd(OPEN_TO_CONNECT_KEYS.ONLINE, tags.userId);
    multi.hset(userKey, {
      profileId: tags.profileId,
      userId: tags.userId,
      displayName: tags.displayName ?? "",
      headline: tags.headline ?? "",
      activityIds: activityIds.join(","),
      moodIds: tags.moodIds.join(","),
      interestIds: tags.interestIds.join(","),
      tagsJson: JSON.stringify({
        activityIds,
        moodIds: tags.moodIds,
        interestIds: tags.interestIds,
      }),
      updatedAt: tags.updatedAt,
    });
    multi.expire(userKey, OPEN_TO_CONNECT_USER_TTL_SEC);
    for (const activityId of activityIds) {
      multi.sadd(OPEN_TO_CONNECT_KEYS.activity(activityId), tags.userId);
    }
    await multi.exec();
  },

  async removeUserFromIndex(userId: string): Promise<void> {
    const redis = getRedis();
    const userKey = OPEN_TO_CONNECT_KEYS.user(userId);
    const activityIdsRaw = await redis.hget(userKey, "activityIds");
    const activityIds = parseActivityIdsFromHash(activityIdsRaw);

    const multi = redis.multi();
    multi.srem(OPEN_TO_CONNECT_KEYS.ONLINE, userId);
    multi.del(userKey);
    for (const activityId of activityIds) {
      multi.srem(OPEN_TO_CONNECT_KEYS.activity(activityId), userId);
    }
    await multi.exec();
  },

  async refreshUserTtlIfIndexed(userId: string): Promise<void> {
    const redis = getRedis();
    const userKey = OPEN_TO_CONNECT_KEYS.user(userId);
    const exists = await redis.exists(userKey);
    if (exists !== 1) return;
    await redis.expire(userKey, OPEN_TO_CONNECT_USER_TTL_SEC);
  },

  async isUserVisibleInDiscovery(userId: string): Promise<boolean> {
    const redis = getRedis();
    const [online, indexed] = await Promise.all([
      redis.sismember(USER_PRESENCE_KEYS.ONLINE_USERS_SET, userId),
      redis.sismember(OPEN_TO_CONNECT_KEYS.ONLINE, userId),
    ]);
    return online === 1 && indexed === 1;
  },

  async listIndexedUserIds(activityId?: string): Promise<string[]> {
    const redis = getRedis();
    if (activityId) {
      return redis.smembers(OPEN_TO_CONNECT_KEYS.activity(activityId));
    }
    return redis.smembers(OPEN_TO_CONNECT_KEYS.ONLINE);
  },

  async filterStillVisibleUserIds(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    const redis = getRedis();
    const pipeline = redis.pipeline();
    for (const userId of userIds) {
      pipeline.sismember(USER_PRESENCE_KEYS.ONLINE_USERS_SET, userId);
      pipeline.sismember(OPEN_TO_CONNECT_KEYS.ONLINE, userId);
    }
    const results = await pipeline.exec();
    const visible: string[] = [];
    for (let i = 0; i < userIds.length; i += 1) {
      const userId = userIds[i];
      if (!userId) continue;
      const online = results?.[i * 2]?.[1];
      const indexed = results?.[i * 2 + 1]?.[1];
      if (online === 1 && indexed === 1) {
        visible.push(userId);
      }
    }
    return visible;
  },

  async readTagsForUsers(userIds: string[]): Promise<Map<string, OpenToConnectTags>> {
    if (userIds.length === 0) return new Map();
    const redis = getRedis();
    const pipeline = redis.pipeline();
    for (const userId of userIds) {
      pipeline.hgetall(OPEN_TO_CONNECT_KEYS.user(userId));
    }
    const results = await pipeline.exec();
    const out = new Map<string, OpenToConnectTags>();
    for (let i = 0; i < userIds.length; i += 1) {
      const userId = userIds[i];
      if (!userId) continue;
      const raw = results?.[i]?.[1];
      if (!raw || typeof raw !== "object") continue;
      const hash = raw as Record<string, string>;
      const activityIds = parseActivityIdsFromHash(hash.activityIds);
      const moodIds = parseActivityIdsFromHash(hash.moodIds);
      const interestIds = parseActivityIdsFromHash(hash.interestIds);
      out.set(userId, {
        profileId: hash.profileId ?? "",
        userId,
        displayName: hash.displayName?.trim() || null,
        headline: hash.headline?.trim() || null,
        activityIds,
        moodIds,
        interestIds,
        updatedAt: hash.updatedAt ?? new Date().toISOString(),
      });
    }
    return out;
  },
};
