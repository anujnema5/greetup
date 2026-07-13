import logger from "@/core/logging";
import { userBlocksRepository } from "@/modules/blocks/repositories/user-blocks.repository";
import { cancelPeerConnectionsOnBlock } from "../lib/cancel-peer-connections-on-block";
import { notifyMessagingBlockChanged } from "../lib/notify-messaging-block-change";
import {
  redisAddUserBlock,
  syncUserBlocksToRedis,
} from "../lib/user-blocks-redis";

export type BlockUserResult =
  | { ok: true; alreadyBlocked: boolean }
  | { ok: false; error: "SELF" };

export async function blockUserService(
  viewerId: string,
  targetUserId: string,
): Promise<BlockUserResult> {
  if (viewerId === targetUserId) {
    logger.warn("block_user_rejected", { viewerId, targetUserId, error: "SELF" });
    return { ok: false, error: "SELF" };
  }

  const alreadyBlocked = await userBlocksRepository.isBlockedBy(viewerId, targetUserId);
  if (!alreadyBlocked) {
    await userBlocksRepository.createBlock(viewerId, targetUserId);
    await redisAddUserBlock(viewerId, targetUserId);
  } else {
    // Repair Redis if a prior block predates the cache layer.
    await redisAddUserBlock(viewerId, targetUserId);
  }

  await cancelPeerConnectionsOnBlock(viewerId, targetUserId);
  notifyMessagingBlockChanged(viewerId, targetUserId, true);

  logger.info("user_blocked", { viewerId, targetUserId, alreadyBlocked });
  return { ok: true, alreadyBlocked };
}

/** Ensures matching can read block lists from Redis (DB is source of truth). */
export async function ensureUserBlocksSyncedForMatching(userId: string): Promise<void> {
  await syncUserBlocksToRedis(userId);
}
