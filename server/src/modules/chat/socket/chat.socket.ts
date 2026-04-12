import type { Namespace, Socket } from 'socket.io';
import logger from '@/core/logging';
import { messageService } from '../services/message.service';
import { conversationRepository } from '../repositories/conversation.repository';

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

      // Broadcast decrypted message to conversation room (over TLS)
      io.to(`conv:${payload.conversationId}`).emit('chat:message:new', msg);

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

      io.to(`conv:${payload.conversationId}`).emit('chat:reaction:update', {
        messageId: payload.messageId,
        reactions,
      });
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

      io.to(`conv:${payload.conversationId}`).emit('chat:reaction:update', {
        messageId: payload.messageId,
        reactions,
      });
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

      io.to(`conv:${payload.conversationId}`).emit('chat:message:edited', updated);
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

      const target = payload.deleteForAll
        ? io.to(`conv:${payload.conversationId}`)
        : socket;

      target.emit('chat:message:deleted', {
        messageId:      payload.messageId,
        conversationId: payload.conversationId,
        deletedForAll:  payload.deleteForAll,
      });
    } catch (err) {
      handleError(socket, 'chat:message:delete', err);
    }
  });
}
