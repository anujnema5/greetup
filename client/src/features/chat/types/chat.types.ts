export type MessageType = 'text' | 'image' | 'video' | 'file' | 'voice' | 'gif' | 'system';
export type ConversationType = 'room_direct' | 'room_circle' | 'connection';
export type MessageStatus = 'sending' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  /** Present on API / socket payloads when server attaches it */
  sender?: ChatUserPreview;
  content: string;
  messageType: MessageType;
  replyToId: string | null;
  mentions: string[] | null;
  systemPayload: unknown;
  editedAt: string | null;
  isDeleted: boolean;
  deletedForAll: boolean;
  createdAt: string;
  // Client-only
  status?: MessageStatus;
  optimisticId?: string;
}

export interface Reaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface ChatUserPreview {
  id: string;
  name: string;
  displayName: string | null;
  image: string | null;
}

export interface ConversationParticipant {
  conversationId: string;
  userId: string;
  wantsPersistence: boolean;
  lastReadMessageId: string | null;
  lastReadAt: string | null;
  joinedAt: string;
  leftAt: string | null;
  /** Present when loaded from list/detail API */
  user?: ChatUserPreview;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  roomId: string | null;
  connectionId: string | null;
  isPersisted: boolean;
  parentConversationId: string | null;
  expandedAt: string | null;
  expandedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  participants: ConversationParticipant[];
  /** Present for room-backed threads from API */
  room?: { id: string; title: string } | null;
}

export interface MessagesPage {
  messages: Message[];
  nextCursor: string | null;
}

// Socket event payloads
export interface TypingPayload {
  conversationId: string;
  userId: string;
}

export interface ReadPayload {
  messageId: string;
  conversationId: string;
  userId: string;
  readAt: string;
}

export interface ReactionUpdatePayload {
  messageId: string;
  reactions: Reaction[];
}

export interface MessageDeletedPayload {
  messageId: string;
  conversationId: string;
  deletedForAll: boolean;
}
