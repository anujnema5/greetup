'use client';

import { useMemo } from 'react';
import {
  isMessagingBlocked,
  messagingBlockBannerText,
  messagingBlockInputPlaceholder,
  messagingBlockSendToast,
} from '../lib/messaging-block';
import type { ActiveMessagingBlock, MessagingBlock } from '../types/messaging-block.types';

export type MessagingBlockState = {
  /** True when either party has blocked the other in this DM. */
  isBlocked: boolean;
  reason: ActiveMessagingBlock['reason'] | null;
  /** Disable composer, typing, reactions, reply, edit, delete, retry. */
  interactionsDisabled: boolean;
  bannerText: string | null;
  inputPlaceholder: string;
  sendErrorToast: string;
};

/**
 * Derives UI + interaction flags from a conversation's `messagingBlock` payload.
 * Pass `forceDisabled` for additional client-side locks (e.g. moderation).
 */
export function useMessagingBlockState(
  messagingBlock: MessagingBlock | undefined,
  options?: { forceDisabled?: boolean },
): MessagingBlockState {
  const forceDisabled = options?.forceDisabled ?? false;

  return useMemo(() => {
    const blocked = isMessagingBlocked(messagingBlock);
    return {
      isBlocked: blocked,
      reason: blocked ? messagingBlock.reason : null,
      interactionsDisabled: blocked || forceDisabled,
      bannerText: messagingBlockBannerText(messagingBlock),
      inputPlaceholder: messagingBlockInputPlaceholder(messagingBlock),
      sendErrorToast: messagingBlockSendToast(messagingBlock),
    };
  }, [messagingBlock, forceDisabled]);
}
