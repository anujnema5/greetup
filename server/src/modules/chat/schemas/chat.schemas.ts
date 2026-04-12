import { z } from 'zod';

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content:        z.string().min(1).max(4000),
  messageType:    z.enum(['text', 'image', 'video', 'file', 'voice', 'gif']).default('text'),
  replyToId:      z.string().uuid().optional(),
  mentions:       z.array(z.string()).optional(),
});

export const editMessageSchema = z.object({
  messageId:      z.string().uuid(),
  conversationId: z.string().uuid(),
  content:        z.string().min(1).max(4000),
});

export const deleteMessageSchema = z.object({
  messageId:      z.string().uuid(),
  conversationId: z.string().uuid(),
  deleteForAll:   z.boolean().default(false),
});

export const reactionSchema = z.object({
  messageId:      z.string().uuid(),
  conversationId: z.string().uuid(),
  emoji:          z.string().min(1).max(8),
});

export const typingSchema = z.object({
  conversationId: z.string().uuid(),
});

export const readMessageSchema = z.object({
  messageId:      z.string().uuid(),
  conversationId: z.string().uuid(),
});

export const createConnectionConversationSchema = z.object({
  targetUserId: z.string(),
});

export const setPersistenceSchema = z.object({
  wantsPersistence: z.boolean(),
});

export const getMessagesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit:  z.coerce.number().min(1).max(50).default(30),
});

export const reportMessageSchema = z.object({
  messageId: z.string().uuid(),
  reason:    z.string().min(1).max(500),
});
