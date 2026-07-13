import type { MessagingBlockReason } from '../types/messaging-block.types';

export const CHAT_SOCKET_ERROR = {
  MESSAGING_BLOCKED: 'MESSAGING_BLOCKED',
  RATE_LIMITED: 'RATE_LIMITED',
} as const;

export const MESSAGING_BLOCK_COPY = {
  banner: {
    you_blocked:
      'You blocked this user. Unblock them in Settings to send messages again.',
    blocked_you: "You can't message this user.",
  } satisfies Record<MessagingBlockReason, string>,
  placeholder: {
    you_blocked: 'You blocked this user',
    blocked_you: "You can't reply",
    default: 'Message…',
  } satisfies Record<MessagingBlockReason | 'default', string>,
  toast: {
    you_blocked: 'You blocked this user. Unblock them in Settings to send messages.',
    blocked_you: "You can't message this user.",
    generic: "You can't send messages in this conversation.",
    interaction: "Messaging isn't available in this conversation.",
  } satisfies Record<MessagingBlockReason | 'generic' | 'interaction', string>,
} as const;
