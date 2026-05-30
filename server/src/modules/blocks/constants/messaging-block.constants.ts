export const MESSAGING_BLOCK_ERROR = {
  MESSAGING_BLOCKED: 'MESSAGING_BLOCKED',
} as const;

export const CHAT_SOCKET_EVENT = {
  MESSAGING_BLOCK: 'chat:messaging:block',
} as const;

export type MessagingBlockErrorCode =
  (typeof MESSAGING_BLOCK_ERROR)[keyof typeof MESSAGING_BLOCK_ERROR];
