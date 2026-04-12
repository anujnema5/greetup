import type { Context } from 'hono';
import logger from '@/core/logging';
import { ApiResponse, internalError } from '@/shared/responses';
import { zodFieldErrorsItems } from '@/shared/validation';
import { messageRepository } from '../repositories/message.repository';
import { conversationRepository } from '../repositories/conversation.repository';
import { reportMessageSchema } from '../schemas/chat.schemas';

export const handleDeleteMessage = async (c: Context) => {
  try {
    const userId = c.get('userId') as string;
    const messageId = c.req.param('id') as string;
    const body = await c.req.json();

    const existing = await messageRepository.findById(messageId);
    if (!existing) {
      return c.json(ApiResponse.error({ message: 'Message not found', statusCode: 404, code: 'NOT_FOUND' }), 404);
    }
    if (existing.senderId !== userId) {
      return c.json(ApiResponse.error({ message: 'Unauthorized', statusCode: 403, code: 'UNAUTHORIZED' }), 403);
    }

    await messageRepository.softDeleteMessage(messageId, body.deleteForAll ?? false);
    return c.json(ApiResponse.success({ ok: true }, 'Message deleted', 200), 200);
  } catch (err) {
    logger.error('Delete message error', { err });
    return internalError(c, err, 'DELETE_MESSAGE_FAILED');
  }
};

export const handlePinMessage = async (c: Context) => {
  try {
    const userId = c.get('userId') as string;
    const messageId = c.req.param('id') as string;

    const existing = await messageRepository.findById(messageId);
    if (!existing) {
      return c.json(ApiResponse.error({ message: 'Message not found', statusCode: 404, code: 'NOT_FOUND' }), 404);
    }

    const isMember = await conversationRepository.isParticipant(existing.conversationId, userId);
    if (!isMember) {
      return c.json(ApiResponse.error({ message: 'Unauthorized', statusCode: 403, code: 'UNAUTHORIZED' }), 403);
    }

    await messageRepository.pinMessage(existing.conversationId, messageId, userId);
    return c.json(ApiResponse.success({ ok: true }, 'Message pinned', 200), 200);
  } catch (err) {
    logger.error('Pin message error', { err });
    return internalError(c, err, 'PIN_MESSAGE_FAILED');
  }
};

export const handleUnpinMessage = async (c: Context) => {
  try {
    const userId = c.get('userId') as string;
    const messageId = c.req.param('id') as string;

    const existing = await messageRepository.findById(messageId) ;
    if (!existing) {
      return c.json(ApiResponse.error({ message: 'Message not found', statusCode: 404, code: 'NOT_FOUND' }), 404);
    }

    const isMember = await conversationRepository.isParticipant(existing.conversationId, userId);
    if (!isMember) {
      return c.json(ApiResponse.error({ message: 'Unauthorized', statusCode: 403, code: 'UNAUTHORIZED' }), 403);
    }

    await messageRepository.unpinMessage(existing.conversationId, messageId);
    return c.json(ApiResponse.success({ ok: true }, 'Message unpinned', 200), 200);
  } catch (err) {
    logger.error('Unpin message error', { err });
    return internalError(c, err, 'UNPIN_MESSAGE_FAILED');
  }
};

export const handleReportMessage = async (c: Context) => {
  try {
    const userId = c.get('userId') as string;
    const body = await c.req.json();
    const parsed = reportMessageSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        ApiResponse.error({
          message: 'Invalid request body',
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          errors: zodFieldErrorsItems(parsed.error),
        }),
        400,
      );
    }

    // Server-side decrypt via AEK — no client plaintext needed
    const existing = await messageRepository.findById(parsed.data.messageId);
    if (!existing) {
      return c.json(ApiResponse.error({ message: 'Message not found', statusCode: 404, code: 'NOT_FOUND' }), 404);
    }

    return c.json(ApiResponse.success({ ok: true }, 'Report submitted', 200), 200);
  } catch (err) {
    logger.error('Report message error', { err });
    return internalError(c, err, 'REPORT_MESSAGE_FAILED');
  }
};
