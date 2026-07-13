import { GUEST_TRIAL_IP_DAILY_CREATE_LIMIT } from "@/core/redis/keys";
import { GuestRateLimitedError, GuestTrialAlreadyUsedError } from "@/shared/errors";

import {
  redisGetIpGuestCreateCount,
  redisIncrementIpGuestCreateCount,
  redisIsDeviceCallTrialConsumed,
} from "../../lib/guest-trial-redis";

export async function assertDeviceMayStartGuestCallTrial(deviceHash: string): Promise<void> {
  if (await redisIsDeviceCallTrialConsumed(deviceHash)) {
    throw new GuestTrialAlreadyUsedError();
  }
}

export async function assertIpMayCreateGuestSession(ipHash: string): Promise<void> {
  const count = await redisGetIpGuestCreateCount(ipHash);
  if (count >= GUEST_TRIAL_IP_DAILY_CREATE_LIMIT) {
    throw new GuestRateLimitedError();
  }
}

export async function incrementIpGuestSessionCreateCount(ipHash: string): Promise<number> {
  return redisIncrementIpGuestCreateCount(ipHash);
}

export async function isDeviceCallTrialConsumed(deviceHash: string): Promise<boolean> {
  return redisIsDeviceCallTrialConsumed(deviceHash);
}
