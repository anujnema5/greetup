import { MESSAGING_BLOCK_ERROR } from '../constants/messaging-block.constants';
import { userBlocksRepository } from '../repositories/user-blocks.repository';
import type { MessagingBlockStatus } from '../types/messaging-block.types';

export type { MessagingBlockReason, MessagingBlockStatus } from '../types/messaging-block.types';

export async function resolveMessagingBlockStatus(
  viewerId: string,
  peerUserId: string,
): Promise<MessagingBlockStatus> {
  const [youBlocked, blockedYou] = await Promise.all([
    userBlocksRepository.isBlockedBy(viewerId, peerUserId),
    userBlocksRepository.isBlockedBy(peerUserId, viewerId),
  ]);

  if (youBlocked) return { isBlocked: true, reason: 'you_blocked' };
  if (blockedYou) return { isBlocked: true, reason: 'blocked_you' };
  return { isBlocked: false };
}

export async function assertMessagingAllowed(
  viewerId: string,
  peerUserId: string,
): Promise<void> {
  const status = await resolveMessagingBlockStatus(viewerId, peerUserId);
  if (status.isBlocked) {
    throw new Error(MESSAGING_BLOCK_ERROR.MESSAGING_BLOCKED);
  }
}
