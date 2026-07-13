/**
 * Redis-backed queue used by the worker to process match requests asynchronously.
 */
import type { FindMatchRequest } from "@/modules/simple-matching/types";
import { getRedis, getRedisBlocking } from "@/core/redis/client";
import { redisKeys } from "@/core/redis/keys";

const toQueuePayload = (request: FindMatchRequest): string => JSON.stringify(request);

const parseQueuePayload = (value: string): FindMatchRequest | null => {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const userId = parsed.userId;
    const requestId = parsed.requestId;
    if (typeof userId !== "string" || typeof requestId !== "string") {
      return null;
    }
    if (userId.trim().length === 0 || requestId.trim().length === 0) {
      return null;
    }
    return {
      userId: userId.trim(),
      requestId: requestId.trim(),
    };
  } catch {
    return null;
  }
};

export class MatchJobQueueService {
  /** Pushes a match request to the head of the queue for worker pickup. */
  async enqueue(request: FindMatchRequest): Promise<void> {
    await getRedis().lpush(redisKeys.matchJobQueue(), toQueuePayload(request));
  }

  /** Blocks for up to `blockSeconds` waiting for the next queued request. */
  async dequeue(blockSeconds = 2): Promise<FindMatchRequest | null> {
    const result = await getRedisBlocking().brpop(redisKeys.matchJobQueue(), blockSeconds);
    if (!result || result.length < 2) {
      return null;
    }
    const payload = result[1];
    if (!payload) {
      return null;
    }
    return parseQueuePayload(payload);
  }
}
