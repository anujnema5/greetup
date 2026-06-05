import { userBlocksRepository } from "@/modules/blocks/repositories/user-blocks.repository";
import { notifyMessagingBlockChanged } from "../lib/notify-messaging-block-change";
import { redisRemoveUserBlock } from "../lib/user-blocks-redis";

export type UnblockUserResult = { ok: true } | { ok: false; error: "NOT_FOUND" };

export async function unblockUserService(
  viewerId: string,
  targetUserId: string,
): Promise<UnblockUserResult> {
  const removed = await userBlocksRepository.removeBlock(viewerId, targetUserId);
  if (!removed) {
    return { ok: false, error: "NOT_FOUND" };
  }

  await redisRemoveUserBlock(viewerId, targetUserId);
  notifyMessagingBlockChanged(viewerId, targetUserId, false);
  return { ok: true };
}
