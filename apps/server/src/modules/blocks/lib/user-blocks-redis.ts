import { getRedis } from "@/core/redis";
import { USER_BLOCK_KEYS } from "@/core/redis/keys";
import { userBlocksRepository } from "../repositories/user-blocks.repository";

export async function redisAddUserBlock(blockerId: string, blockedId: string): Promise<void> {
  const redis = getRedis();
  await redis
    .pipeline()
    .sadd(USER_BLOCK_KEYS.outgoing(blockerId), blockedId)
    .sadd(USER_BLOCK_KEYS.incoming(blockedId), blockerId)
    .exec();
}

export async function redisRemoveUserBlock(blockerId: string, blockedId: string): Promise<void> {
  const redis = getRedis();
  await redis
    .pipeline()
    .srem(USER_BLOCK_KEYS.outgoing(blockerId), blockedId)
    .srem(USER_BLOCK_KEYS.incoming(blockedId), blockerId)
    .exec();
}

/** Rebuild Redis block sets for one user from Postgres (backfill + repair). */
export async function syncUserBlocksToRedis(userId: string): Promise<void> {
  const [outgoing, incoming] = await Promise.all([
    userBlocksRepository.listBlockedUserIds(userId),
    userBlocksRepository.listBlockerUserIds(userId),
  ]);

  const redis = getRedis();
  const outgoingKey = USER_BLOCK_KEYS.outgoing(userId);
  const incomingKey = USER_BLOCK_KEYS.incoming(userId);
  const pipeline = redis.pipeline();
  pipeline.del(outgoingKey);
  pipeline.del(incomingKey);
  if (outgoing.length > 0) {
    pipeline.sadd(outgoingKey, ...outgoing);
  }
  if (incoming.length > 0) {
    pipeline.sadd(incomingKey, ...incoming);
  }
  await pipeline.exec();
}

export async function isBlockedWithPeerInRedis(a: string, b: string): Promise<boolean> {
  const redis = getRedis();
  const results = await redis
    .pipeline()
    .sismember(USER_BLOCK_KEYS.outgoing(a), b)
    .sismember(USER_BLOCK_KEYS.incoming(a), b)
    .exec();

  return results?.some((row) => row?.[1] === 1) ?? false;
}
