/** Directional block state for a 1:1 DM thread (client mirror of server `MessagingBlockStatus`). */export type MessagingBlockReason = 'you_blocked' | 'blocked_you';

export type MessagingBlock =
  | { isBlocked: false }
  | { isBlocked: true; reason: MessagingBlockReason };

export type ActiveMessagingBlock = Extract<MessagingBlock, { isBlocked: true }>;

/** Emitted when a user blocks or unblocks someone (`chat:messaging:block`). */
export type MessagingBlockSocketPayload = {
  blockerUserId: string;
  blockedUserId: string;
  blocked: boolean;
};
