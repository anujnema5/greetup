export type MessagingBlockReason = 'you_blocked' | 'blocked_you';

export type MessagingBlockStatus =
  | { isBlocked: false }
  | { isBlocked: true; reason: MessagingBlockReason };

export type MessagingBlockSocketPayload = {
  blockerUserId: string;
  blockedUserId: string;
  blocked: boolean;
};

/** Minimal conversation shape for DM peer resolution. */
export type ConversationWithParticipants = {
  type: string;
  participants: { userId: string }[];
};
