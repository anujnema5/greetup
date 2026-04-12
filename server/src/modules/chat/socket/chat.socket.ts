import type { Namespace, Socket } from 'socket.io';
import logger from '@/core/logging';
import { getRedis } from '@/core/redis';
import { CHAT_KEYS } from '@/core/redis/keys';
import { conversationRepository } from '../repositories/conversation.repository';
import { inboxPreviewFromMessageRow, messageService } from '../services/message.service';

function emitToParticipantUsers(
  io: Namespace,
  participants: { userId: string }[],
  event: string,
  payload: unknown,
) {
  for (const p of participants) {
    io.to(`user:${p.userId}`).emit(event, payload);
  }
}

async function emitReactionUpdateToParticipants(
  io: Namespace,
  conversationId: string,
  messageId: string,
  reactions: unknown,
) {
  const conv = await conversationRepository.findById(conversationId);
  if (!conv) return;
  emitToParticipantUsers(io, conv.participants, 'chat:reaction:update', {
    messageId,
    conversationId,
    reactions,
  });
}

function handleError(socket: Socket, event: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  logger.error(`[chat.socket] ${event} error: ${msg}`);

  if (msg === 'UNAUTHORIZED') {
    socket.emit('chat:error', { code: 'UNAUTHORIZED', event });
  } else {
    socket.emit('chat:error', { code: 'INTERNAL_ERROR', event });
  }
}

export function registerChatSocketHandlers(io: Namespace, socket: Socket) {
  const userId = socket.userId!;

  // ── Join/Leave conversation rooms ──────────────────────────────────────────

  socket.on('chat:room:join', (conversationId: string) => {
    logger.info(`User ${userId} joining conversation ${conversationId} with socket ${socket.id}`);
    socket.join(`conv:${conversationId}`);
  });

  socket.on('chat:room:leave', (conversationId: string) => {
    socket.leave(`conv:${conversationId}`);
  });

  // ── Send message ───────────────────────────────────────────────────────────

  socket.on('chat:message:send', async (
    payload: {
      conversationId: string;
      content: string;
      messageType?: 'text' | 'image' | 'video' | 'file' | 'voice' | 'gif';
      replyToId?: string;
      mentions?: string[];
    },
    ack?: (result: { success: boolean; messageId?: string; error?: string }) => void,
  ) => {
    try {
      const withinLimit = await messageService.checkRateLimit(userId);
      if (!withinLimit) {
        socket.emit('chat:warning', { code: 'RATE_LIMITED' });
        ack?.({ success: false, error: 'RATE_LIMITED' });
        return;
      }

      const msg = await messageService.send({
        conversationId: payload.conversationId,
        senderId:       userId,
        content:        payload.content,
        messageType:    payload.messageType,
        replyToId:      payload.replyToId,
        mentions:       payload.mentions,
      });

      const conv = await conversationRepository.findById(payload.conversationId);
      if (conv) {
        emitToParticipantUsers(io, conv.participants, 'chat:message:new', msg);

        const redis = getRedis();
        const lastActivityAt =
          msg.createdAt instanceof Date
            ? msg.createdAt.toISOString()
            : typeof msg.createdAt === 'string'
              ? msg.createdAt
              : new Date().toISOString();

        const lastMessagePreview = inboxPreviewFromMessageRow(msg);

        for (const p of conv.participants) {
          io.to(`user:${p.userId}`).emit('chat:conversation:activity', {
            conversationId:      payload.conversationId,
            lastActivityAt,
            lastMessagePreview,
          });

          if (p.userId === userId) continue;
          const raw = await redis.hget(CHAT_KEYS.unreadCounts(p.userId), payload.conversationId);
          const unreadCount = Number.parseInt(raw ?? '0', 10) || 0;
          io.to(`user:${p.userId}`).emit('chat:unread:sync', {
            conversationId: payload.conversationId,
            unreadCount,
          });
        }
      } else {
        io.to(`user:${userId}`).emit('chat:message:new', msg);
      }

      ack?.({ success: true, messageId: msg.id });
    } catch (err) {
      handleError(socket, 'chat:message:send', err);
      ack?.({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  // ── Mark read ──────────────────────────────────────────────────────────────

  socket.on('chat:message:read', async (payload: {
    messageId: string;
    conversationId: string;
  }) => {
    try {
      await messageService.markRead({
        conversationId: payload.conversationId,
        messageId:      payload.messageId,
        userId,
      });

      io.to(`conv:${payload.conversationId}`).emit('chat:message:read', {
        messageId:      payload.messageId,
        conversationId: payload.conversationId,
        userId,
        readAt:         new Date(),
      });

      io.to(`user:${userId}`).emit('chat:unread:sync', {
        conversationId: payload.conversationId,
        unreadCount:    0,
      });
    } catch (err) {
      handleError(socket, 'chat:message:read', err);
    }
  });

  // ── Typing ─────────────────────────────────────────────────────────────────

  socket.on('chat:typing:start', async (payload: { conversationId: string }) => {
    try {
      await messageService.setTyping(payload.conversationId, userId, true);
      socket.to(`conv:${payload.conversationId}`).emit('chat:typing:start', {
        conversationId: payload.conversationId,
        userId,
      });
    } catch (err) {
      handleError(socket, 'chat:typing:start', err);
    }
  });

  socket.on('chat:typing:stop', async (payload: { conversationId: string }) => {
    try {
      await messageService.setTyping(payload.conversationId, userId, false);
      socket.to(`conv:${payload.conversationId}`).emit('chat:typing:stop', {
        conversationId: payload.conversationId,
        userId,
      });
    } catch (err) {
      handleError(socket, 'chat:typing:stop', err);
    }
  });

  // ── Reactions ──────────────────────────────────────────────────────────────

  socket.on('chat:reaction:add', async (payload: {
    messageId: string;
    conversationId: string;
    emoji: string;
  }) => {
    try {
      const reactions = await messageService.addReaction({
        messageId:      payload.messageId,
        conversationId: payload.conversationId,
        userId,
        emoji:          payload.emoji,
      });

      await emitReactionUpdateToParticipants(
        io,
        payload.conversationId,
        payload.messageId,
        reactions,
      );
    } catch (err) {
      handleError(socket, 'chat:reaction:add', err);
    }
  });

  socket.on('chat:reaction:remove', async (payload: {
    messageId: string;
    conversationId: string;
    emoji: string;
  }) => {
    try {
      const reactions = await messageService.removeReaction({
        messageId:      payload.messageId,
        conversationId: payload.conversationId,
        userId,
        emoji:          payload.emoji,
      });

      await emitReactionUpdateToParticipants(
        io,
        payload.conversationId,
        payload.messageId,
        reactions,
      );
    } catch (err) {
      handleError(socket, 'chat:reaction:remove', err);
    }
  });

  // ── Edit ───────────────────────────────────────────────────────────────────

  socket.on('chat:message:edit', async (payload: {
    messageId: string;
    conversationId: string;
    content: string;
  }) => {
    try {
      const updated = await messageService.editMessage({
        messageId: payload.messageId,
        senderId:  userId,
        content:   payload.content,
      });

      if (updated) {
        const conv = await conversationRepository.findById(payload.conversationId);
        if (conv) {
          emitToParticipantUsers(io, conv.participants, 'chat:message:edited', updated);

          const lastActivityAt = new Date().toISOString();
          const lastMessagePreview = inboxPreviewFromMessageRow(updated);
          for (const p of conv.participants) {
            io.to(`user:${p.userId}`).emit('chat:conversation:activity', {
              conversationId:      payload.conversationId,
              lastActivityAt,
              lastMessagePreview,
            });
          }
        }
      }
    } catch (err) {
      handleError(socket, 'chat:message:edit', err);
    }
  });

  // ── Delete ─────────────────────────────────────────────────────────────────

  socket.on('chat:message:delete', async (payload: {
    messageId: string;
    conversationId: string;
    deleteForAll: boolean;
  }) => {
    try {
      await messageService.deleteMessage({
        messageId:    payload.messageId,
        senderId:     userId,
        deleteForAll: payload.deleteForAll,
      });

      const deletedPayload = {
        messageId:      payload.messageId,
        conversationId: payload.conversationId,
        deletedForAll:  payload.deleteForAll,
      };

      const conv = await conversationRepository.findById(payload.conversationId);
      if (payload.deleteForAll && conv) {
        emitToParticipantUsers(io, conv.participants, 'chat:message:deleted', deletedPayload);
      } else if (!payload.deleteForAll) {
        socket.emit('chat:message:deleted', deletedPayload);
      }

      if (conv) {
        const lastMessagePreview = await messageService.inboxPreviewForConversation(payload.conversationId);
        for (const p of conv.participants) {
          io.to(`user:${p.userId}`).emit('chat:conversation:activity', {
            conversationId: payload.conversationId,
            lastMessagePreview,
          });
        }
      }
    } catch (err) {
      handleError(socket, 'chat:message:delete', err);
    }
  });
}
