import { getChatNamespace } from '@/core/socket/socket';
import { CHAT_SOCKET_EVENT } from '../constants/messaging-block.constants';
import type { MessagingBlockSocketPayload } from '../types/messaging-block.types';

/** Notifies both users so open chat threads refresh messaging block state. */
export function notifyMessagingBlockChanged(
  blockerId: string,
  blockedId: string,
  blocked: boolean,
): void {
  try {
    const io = getChatNamespace();
    const payload: MessagingBlockSocketPayload = {
      blockerUserId: blockerId,
      blockedUserId: blockedId,
      blocked,
    };
    io.to(`user:${blockerId}`).emit(CHAT_SOCKET_EVENT.MESSAGING_BLOCK, payload);
    io.to(`user:${blockedId}`).emit(CHAT_SOCKET_EVENT.MESSAGING_BLOCK, payload);
  } catch {
    /* socket namespace may be unavailable during startup/tests */
  }
}
