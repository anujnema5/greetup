import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  jsonb,
  index,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { userConnections } from './connections';
import { rooms } from './rooms';

// ── Enums ─────────────────────────────────────────────────────────────────────

export const conversationTypeEnum = pgEnum('conversation_type', [
  'room_direct',
  'room_circle',
  'connection',
]);

export const messageTypeEnum = pgEnum('message_type', [
  'text', 'image', 'video', 'file', 'voice', 'gif', 'system',
]);

export const chatMediaTypeEnum = pgEnum('chat_media_type', [
  'image', 'video', 'file', 'voice', 'gif',
]);

// ── Conversations ─────────────────────────────────────────────────────────────

export const conversations = pgTable('conversations', {
  id:           uuid('id').primaryKey().defaultRandom(),
  type:         conversationTypeEnum('type').notNull(),
  roomId:       uuid('room_id').references(() => rooms.id),
  connectionId: uuid('connection_id').references(() => userConnections.id),
  isPersisted:  boolean('is_persisted').notNull().default(false),

  parentConversationId: uuid('parent_conversation_id'),
  expandedAt:           timestamp('expanded_at'),
  expandedByUserId:     text('expanded_by_user_id').references(() => users.id),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ── Conversation Participants ─────────────────────────────────────────────────

export const conversationParticipants = pgTable(
  'conversation_participants',
  {
    conversationId:      uuid('conversation_id').notNull()
                           .references(() => conversations.id, { onDelete: 'cascade' }),
    userId:              text('user_id').notNull().references(() => users.id),
    wantsPersistence:    boolean('wants_persistence').notNull().default(true),
    lastReadMessageId:   uuid('last_read_message_id'),
    lastReadAt:          timestamp('last_read_at'),
    joinedFromMessageId: uuid('joined_from_message_id'),
    joinedAt:            timestamp('joined_at').notNull().defaultNow(),
    leftAt:              timestamp('left_at'),
    /** Messages at or before this time are hidden for this user after they delete the chat. */
    historyHiddenBeforeAt: timestamp('history_hidden_before_at'),
  },
  (t) => [primaryKey({ columns: [t.conversationId, t.userId] })],
);

// ── Messages ──────────────────────────────────────────────────────────────────

export const messages = pgTable(
  'messages',
  {
    id:               uuid('id').primaryKey().defaultRandom(),
    conversationId:   uuid('conversation_id').notNull()
                        .references(() => conversations.id, { onDelete: 'cascade' }),
    senderId:         text('sender_id').notNull().references(() => users.id),

    encryptedContent: text('encrypted_content').notNull(),
    iv:               text('iv').notNull(),

    messageType:      messageTypeEnum('message_type').notNull().default('text'),
    replyToId:        uuid('reply_to_id'),
    forwardedFromConversationId: uuid('forwarded_from_conversation_id'),
    mentions:         text('mentions').array(),
    systemPayload:    jsonb('system_payload'),

    editedAt:      timestamp('edited_at'),
    editHistory:   jsonb('edit_history'),
    isDeleted:     boolean('is_deleted').notNull().default(false),
    deletedForAll: boolean('deleted_for_all').notNull().default(false),
    deletedAt:     timestamp('deleted_at'),
    createdAt:     timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('messages_conv_created_idx').on(t.conversationId, t.createdAt),
  ],
);

// ── Message Media ─────────────────────────────────────────────────────────────

export const messageMedia = pgTable('message_media', {
  id:           uuid('id').primaryKey().defaultRandom(),
  messageId:    uuid('message_id').notNull()
                  .references(() => messages.id, { onDelete: 'cascade' }),
  mediaUrl:     text('media_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  mediaType:    chatMediaTypeEnum('media_type').notNull(),
  fileName:     text('file_name'),
  mimeType:     text('mime_type').notNull(),
  fileSize:     integer('file_size'),
  duration:     integer('duration'),
  width:        integer('width'),
  height:       integer('height'),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
});

// ── Message Reactions ─────────────────────────────────────────────────────────

export const messageReactions = pgTable(
  'message_reactions',
  {
    id:        uuid('id').primaryKey().defaultRandom(),
    messageId: uuid('message_id').notNull()
                 .references(() => messages.id, { onDelete: 'cascade' }),
    userId:    text('user_id').notNull().references(() => users.id),
    emoji:     text('emoji').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('unique_reaction_idx').on(t.messageId, t.userId, t.emoji),
  ],
);

// ── Read Receipts ─────────────────────────────────────────────────────────────

export const messageReadReceipts = pgTable(
  'message_read_receipts',
  {
    messageId: uuid('message_id').notNull()
                 .references(() => messages.id, { onDelete: 'cascade' }),
    userId:    text('user_id').notNull().references(() => users.id),
    readAt:    timestamp('read_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.messageId, t.userId] })],
);

// ── Pinned Messages ───────────────────────────────────────────────────────────

export const pinnedMessages = pgTable(
  'pinned_messages',
  {
    conversationId: uuid('conversation_id').notNull()
                      .references(() => conversations.id, { onDelete: 'cascade' }),
    messageId:      uuid('message_id').notNull()
                      .references(() => messages.id, { onDelete: 'cascade' }),
    pinnedBy:  text('pinned_by').notNull().references(() => users.id),
    pinnedAt:  timestamp('pinned_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.conversationId, t.messageId] })],
);

// ── Relations ─────────────────────────────────────────────────────────────────

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  room:        one(rooms, { fields: [conversations.roomId], references: [rooms.id] }),
  connection:  one(userConnections, { fields: [conversations.connectionId], references: [userConnections.id] }),
  expandedBy:  one(users, { fields: [conversations.expandedByUserId], references: [users.id] }),
  participants: many(conversationParticipants),
  messages:    many(messages),
}));

export const conversationParticipantsRelations = relations(conversationParticipants, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationParticipants.conversationId],
    references: [conversations.id],
  }),
  user: one(users, {
    fields: [conversationParticipants.userId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  media:     many(messageMedia),
  reactions: many(messageReactions),
  readReceipts: many(messageReadReceipts),
}));

export const messageMediaRelations = relations(messageMedia, ({ one }) => ({
  message: one(messages, { fields: [messageMedia.messageId], references: [messages.id] }),
}));

export const messageReactionsRelations = relations(messageReactions, ({ one }) => ({
  message: one(messages, { fields: [messageReactions.messageId], references: [messages.id] }),
  user:    one(users,    { fields: [messageReactions.userId],    references: [users.id] }),
}));

export const messageReadReceiptsRelations = relations(messageReadReceipts, ({ one }) => ({
  message: one(messages, { fields: [messageReadReceipts.messageId], references: [messages.id] }),
  user:    one(users,    { fields: [messageReadReceipts.userId],    references: [users.id] }),
}));

export const pinnedMessagesRelations = relations(pinnedMessages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [pinnedMessages.conversationId],
    references: [conversations.id],
  }),
  message: one(messages, { fields: [pinnedMessages.messageId], references: [messages.id] }),
  pinnedByUser: one(users, { fields: [pinnedMessages.pinnedBy], references: [users.id] }),
}));
