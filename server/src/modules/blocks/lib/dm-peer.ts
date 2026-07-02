import type { ConversationWithParticipants } from '../types/messaging-block.types';

/** The other participant in a 1:1 thread (`connection` or `room_direct`). */
export function getDmPeerUserId(
  conversation: ConversationWithParticipants,
  viewerId: string,
): string | null {
  if (conversation.type === 'room_space') return null;

  const others = conversation.participants.filter((p) => p.userId !== viewerId);
  if (others.length !== 1) return null;

  return others[0]!.userId;
}
