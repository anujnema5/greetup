import type { Context } from 'hono';
import logger from '@/core/logging';
import { ApiResponse, internalError } from '@/shared/responses';
import { zodFieldErrorsItems } from '@/shared/validation';
import { conversationService } from '../services/conversation.service';
import { messageService } from '../services/message.service';
import {
  createConnectionConversationSchema,
  setPersistenceSchema,
  getMessagesQuerySchema,
} from '../schemas/chat.schemas';

export const handleListConversations = async (c: Context) => {
  try {
    const userId = c.get('userId') as string;
    const convs = await conversationService.listForUser(userId);
    return c.json(ApiResponse.success(convs, 'Conversations retrieved', 200), 200);
  } catch (err) {
    logger.error('List conversations error', { err });
    return internalError(c, err, 'LIST_CONVERSATIONS_FAILED');
  }
};

export const handleGetConversation = async (c: Context) => {
  try {
    const userId = c.get('userId') as string;
    const conversationId = c.req.param('id') as string;

    const conv = await conversationService.getById(conversationId, userId);
    if (!conv) {
      return c.json(ApiResponse.error({ message: 'Conversation not found', statusCode: 404, code: 'NOT_FOUND' }), 404);
    }

    return c.json(ApiResponse.success(conv, 'Conversation retrieved', 200), 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'UNAUTHORIZED') {
      return c.json(ApiResponse.error({ message: 'Unauthorized', statusCode: 403, code: 'UNAUTHORIZED' }), 403);
    }
    logger.error('Get conversation error', { err });
    return internalError(c, err, 'GET_CONVERSATION_FAILED');
  }
};

export const handleGetMessages = async (c: Context) => {
  try {
    const userId = c.get('userId') as string;
    const conversationId = c.req.param('id') as string;
    const parsed = getMessagesQuerySchema.safeParse(c.req.query());

    if (!parsed.success) {
      return c.json(
        ApiResponse.error({
          message: 'Invalid query parameters',
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          errors: zodFieldErrorsItems(parsed.error),
        }),
        400,
      );
    }

    const result = await messageService.getMessages({
      conversationId,
      userId,
      cursor: parsed.data.cursor,
      limit: parsed.data.limit,
    });

    return c.json(ApiResponse.success(result, 'Messages retrieved', 200), 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'UNAUTHORIZED') {
      return c.json(ApiResponse.error({ message: 'Unauthorized', statusCode: 403, code: 'UNAUTHORIZED' }), 403);
    }
    logger.error('Get messages error', { err });
    return internalError(c, err, 'GET_MESSAGES_FAILED');
  }
};

export const handleCreateConnectionConversation = async (c: Context) => {
  try {
    const userId = c.get('userId') as string;
    const body = await c.req.json();
    const parsed = createConnectionConversationSchema.safeParse(body);

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

    const conv = await conversationService.getOrCreateConnectionConversation(
      userId,
      parsed.data.targetUserId,
    );

    return c.json(ApiResponse.success(conv, 'Conversation retrieved', 200), 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'NOT_CONNECTIONS') {
      return c.json(
        ApiResponse.error({ message: 'You are not connected with this user', statusCode: 403, code: 'NOT_CONNECTIONS' }),
        403,
      );
    }
    logger.error('Create connection conversation error', { err });
    return internalError(c, err, 'CREATE_CONNECTION_CONVERSATION_FAILED');
  }
};

export const handleSetPersistence = async (c: Context) => {
  try {
    const userId = c.get('userId') as string;
    const conversationId = c.req.param('id') as string;
    const body = await c.req.json();
    const parsed = setPersistenceSchema.safeParse(body);

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

    await conversationService.setPersistence(conversationId, userId, parsed.data.wantsPersistence);
    return c.json(ApiResponse.success({ ok: true }, 'Persistence updated', 200), 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'UNAUTHORIZED') {
      return c.json(ApiResponse.error({ message: 'Unauthorized', statusCode: 403, code: 'UNAUTHORIZED' }), 403);
    }
    logger.error('Set persistence error', { err });
    return internalError(c, err, 'SET_PERSISTENCE_FAILED');
  }
};
