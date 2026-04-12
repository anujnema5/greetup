import { Hono } from 'hono';
import {
  handleListConversations,
  handleGetConversation,
  handleGetMessages,
  handleCreateConnectionConversation,
  handleSetPersistence,
} from './controllers/conversations.controller';
import {
  handleDeleteMessage,
  handlePinMessage,
  handleUnpinMessage,
  handleReportMessage,
} from './controllers/messages.controller';

export const chatRoute = new Hono();

// Conversations
chatRoute.get('/conversations', handleListConversations);
chatRoute.get('/conversations/:id', handleGetConversation);
chatRoute.get('/conversations/:id/messages', handleGetMessages);
chatRoute.post('/conversations/connection', handleCreateConnectionConversation);
chatRoute.patch('/conversations/:id/persistence', handleSetPersistence);

// Messages
chatRoute.delete('/messages/:id', handleDeleteMessage);
chatRoute.post('/messages/:id/pin', handlePinMessage);
chatRoute.delete('/messages/:id/pin', handleUnpinMessage);
chatRoute.post('/report', handleReportMessage);
