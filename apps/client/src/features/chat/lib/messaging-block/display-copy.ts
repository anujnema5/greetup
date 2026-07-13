import { MESSAGING_BLOCK_COPY } from '../../constants/messaging-block.constants';
import type { MessagingBlock } from '../../types/messaging-block.types';
import { isMessagingBlocked } from './guards';

export function messagingBlockBannerText(block: MessagingBlock | undefined): string | null {
  if (!isMessagingBlocked(block)) return null;
  return MESSAGING_BLOCK_COPY.banner[block.reason];
}

export function messagingBlockInputPlaceholder(block: MessagingBlock | undefined): string {
  if (!isMessagingBlocked(block)) return MESSAGING_BLOCK_COPY.placeholder.default;
  return MESSAGING_BLOCK_COPY.placeholder[block.reason];
}

export function messagingBlockSendToast(block: MessagingBlock | undefined): string {
  if (!isMessagingBlocked(block)) return MESSAGING_BLOCK_COPY.toast.generic;
  return MESSAGING_BLOCK_COPY.toast[block.reason];
}

export function messagingBlockInteractionToast(): string {
  return MESSAGING_BLOCK_COPY.toast.interaction;
}
