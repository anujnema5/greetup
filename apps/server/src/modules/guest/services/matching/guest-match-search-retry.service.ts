import { GuestSearchRetryExhaustedError } from "@/shared/errors";

import { GUEST_MATCH_SEARCH_RETRY_LIMIT } from "../../constants/guest-trial.constants";
import {
  redisGetGuestMatchSearchCount,
  redisIncrementGuestMatchSearchCount,
} from "../../lib/guest-trial-redis";

export async function getGuestMatchSearchAttemptsUsed(guestUserId: string): Promise<number> {
  return redisGetGuestMatchSearchCount(guestUserId);
}

export function getGuestMatchSearchAttemptsRemaining(attemptsUsed: number): number {
  return Math.max(0, GUEST_MATCH_SEARCH_RETRY_LIMIT - attemptsUsed);
}

export async function assertGuestMatchSearchRetriesAvailable(guestUserId: string): Promise<void> {
  const attemptsUsed = await redisGetGuestMatchSearchCount(guestUserId);
  if (attemptsUsed >= GUEST_MATCH_SEARCH_RETRY_LIMIT) {
    throw new GuestSearchRetryExhaustedError();
  }
}

export async function recordGuestMatchSearchAttempt(guestUserId: string): Promise<number> {
  return redisIncrementGuestMatchSearchCount(guestUserId);
}
