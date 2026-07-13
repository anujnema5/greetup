import type { ActiveMessagingBlock, MessagingBlock } from '../../types/messaging-block.types';

export function isMessagingBlocked(
  block: MessagingBlock | undefined,
): block is ActiveMessagingBlock {
  return block?.isBlocked === true;
}
