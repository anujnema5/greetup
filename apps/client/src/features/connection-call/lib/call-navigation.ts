/** Return path after a connection call ends before the peer joins. */
export function messagesDirectConversationPath(conversationId: string): string {
  return `/messages/d/${conversationId}`;
}
