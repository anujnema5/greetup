import { getRedis } from "@/core/redis";
import {
  GUEST_TRIAL_DEVICE_CONSUMED_TTL_SEC,
  GUEST_TRIAL_KEYS,
} from "@/core/redis/keys";

import { GUEST_SESSION_TTL_MS } from "../constants/guest-trial.constants";
import { guestTrialUtcDateKey } from "./guest-trial-hash";

const GUEST_MATCH_SEARCH_COUNT_TTL_SEC = Math.ceil(GUEST_SESSION_TTL_MS / 1000);

export async function redisIsDeviceCallTrialConsumed(deviceHash: string): Promise<boolean> {
  const normalized = deviceHash.trim();
  if (!normalized) return false;
  const redis = getRedis();
  return (await redis.exists(GUEST_TRIAL_KEYS.deviceCallTrialConsumed(normalized))) === 1;
}

export async function redisMarkDeviceCallTrialConsumed(deviceHash: string): Promise<void> {
  const normalized = deviceHash.trim();
  if (!normalized) return;
  const redis = getRedis();
  await redis.set(
    GUEST_TRIAL_KEYS.deviceCallTrialConsumed(normalized),
    "1",
    "EX",
    GUEST_TRIAL_DEVICE_CONSUMED_TTL_SEC,
  );
}

export async function redisGetIpGuestCreateCount(ipHash: string): Promise<number> {
  const normalized = ipHash.trim();
  if (!normalized) return 0;
  const redis = getRedis();
  const raw = await redis.get(
    GUEST_TRIAL_KEYS.ipGuestCreateCount(normalized, guestTrialUtcDateKey()),
  );
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function redisIncrementIpGuestCreateCount(ipHash: string): Promise<number> {
  const normalized = ipHash.trim();
  if (!normalized) return 0;
  const redis = getRedis();
  const key = GUEST_TRIAL_KEYS.ipGuestCreateCount(normalized, guestTrialUtcDateKey());
  const next = await redis.incr(key);
  if (next === 1) {
    await redis.expire(key, 24 * 60 * 60);
  }
  return next;
}

export async function redisGetGuestMatchSearchCount(guestUserId: string): Promise<number> {
  const normalized = guestUserId.trim();
  if (!normalized) return 0;
  const redis = getRedis();
  const raw = await redis.get(GUEST_TRIAL_KEYS.guestMatchSearchCount(normalized));
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function redisIncrementGuestMatchSearchCount(guestUserId: string): Promise<number> {
  const normalized = guestUserId.trim();
  if (!normalized) return 0;
  const redis = getRedis();
  const key = GUEST_TRIAL_KEYS.guestMatchSearchCount(normalized);
  const next = await redis.incr(key);
  if (next === 1) {
    await redis.expire(key, GUEST_MATCH_SEARCH_COUNT_TTL_SEC);
  }
  return next;
}
