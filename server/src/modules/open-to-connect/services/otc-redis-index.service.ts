import { getRedis } from "@/core/redis";
import {
  OPEN_TO_CONNECT_KEYS,
  OPEN_TO_CONNECT_USER_TTL_SEC,
  USER_PRESENCE_KEYS,
} from "@/core/redis/keys";
import { userPresenceHashKey } from "@/modules/presence/lib/user-presence-key";
import type { OpenToConnectTags } from "../types";

function parseActivityIdsFromHash(raw: string | null | undefined): string[] {
  if (!raw || raw.trim() === "") return [];
  return raw.split(",").map((id) => id.trim()).filter(Boolean);
}

export const otcRedisIndexService = {
  async isUserOnline(userId: string): Promise<boolean> {
    return (await getRedis().exists(userPresenceHashKey(userId))) === 1;
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
    const activityIds = parseActivityIdsFromHash(await redis.hget(userKey, "activityIds"));

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
    if ((await redis.exists(userKey)) !== 1) return;
    await redis.expire(userKey, OPEN_TO_CONNECT_USER_TTL_SEC);
  },

  /** Visible only while both TTL'd hashes exist (sets alone can be stale). */
  async isUserVisibleInDiscovery(userId: string): Promise<boolean> {
    const redis = getRedis();
    const [presence, otc] = await Promise.all([
      redis.exists(userPresenceHashKey(userId)),
      redis.exists(OPEN_TO_CONNECT_KEYS.user(userId)),
    ]);
    return presence === 1 && otc === 1;
  },

  async listIndexedUserIds(activityId?: string): Promise<string[]> {
    const redis = getRedis();
    if (activityId) return redis.smembers(OPEN_TO_CONNECT_KEYS.activity(activityId));
    return redis.smembers(OPEN_TO_CONNECT_KEYS.ONLINE);
  },

  async filterStillVisibleUserIds(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    const redis = getRedis();
    const pipe = redis.pipeline();
    for (const userId of userIds) {
      pipe.exists(userPresenceHashKey(userId));
      pipe.exists(OPEN_TO_CONNECT_KEYS.user(userId));
    }
    const results = await pipe.exec();

    const visible: string[] = [];
    const stale: string[] = [];
    const offline: string[] = [];
    for (let i = 0; i < userIds.length; i += 1) {
      const userId = userIds[i];
      if (!userId) continue;
      const presenceOk = results?.[i * 2]?.[1] === 1;
      const otcOk = results?.[i * 2 + 1]?.[1] === 1;
      if (presenceOk && otcOk) {
        visible.push(userId);
        continue;
      }
      stale.push(userId);
      if (!presenceOk) offline.push(userId);
    }

    if (stale.length > 0) {
      void Promise.all(stale.map((id) => otcRedisIndexService.removeUserFromIndex(id)));
    }
    if (offline.length > 0) {
      void redis.srem(USER_PRESENCE_KEYS.ONLINE_USERS_SET, ...offline);
    }
    return visible;
  },

  async readTagsForUsers(userIds: string[]): Promise<Map<string, OpenToConnectTags>> {
    if (userIds.length === 0) return new Map();
    const redis = getRedis();
    const pipe = redis.pipeline();
    for (const userId of userIds) {
      pipe.hgetall(OPEN_TO_CONNECT_KEYS.user(userId));
    }
    const results = await pipe.exec();
    const out = new Map<string, OpenToConnectTags>();
    for (let i = 0; i < userIds.length; i += 1) {
      const userId = userIds[i];
      if (!userId) continue;
      const raw = results?.[i]?.[1];
      if (!raw || typeof raw !== "object") continue;
      const hash = raw as Record<string, string>;
      if (!hash.profileId && !hash.userId) continue;
      out.set(userId, {
        profileId: hash.profileId ?? "",
        userId,
        displayName: hash.displayName?.trim() || null,
        headline: hash.headline?.trim() || null,
        activityIds: parseActivityIdsFromHash(hash.activityIds),
        moodIds: parseActivityIdsFromHash(hash.moodIds),
        interestIds: parseActivityIdsFromHash(hash.interestIds),
        updatedAt: hash.updatedAt ?? new Date().toISOString(),
      });
    }
    return out;
  },
};
