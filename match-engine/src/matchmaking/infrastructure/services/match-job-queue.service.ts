import type { FindMatchRequest } from "@/contracts/matchmaking.contracts";
import { getRedis } from "@/redis/client";
import { redisKeys } from "@/redis/keys";

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
  async enqueue(request: FindMatchRequest): Promise<void> {
    await getRedis().lpush(redisKeys.matchJobQueue(), toQueuePayload(request));
  }

  async dequeue(blockSeconds = 2): Promise<FindMatchRequest | null> {
    const result = await getRedis().brpop(redisKeys.matchJobQueue(), blockSeconds);
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
