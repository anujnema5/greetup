'use client';

import { ChatInboxSocketBridge } from './chat-inbox-socket-bridge';
import { ChatIncomingMessageToastBridge } from './chat-incoming-message-toast-bridge';
import { ChatMessagesCacheBridge } from './chat-messages-cache-bridge';

/** Mount once in root layout — wires chat socket listeners (inbox, cache, toasts). */
export function ChatRealtimeBridges() {
  return (
    <>
      <ChatInboxSocketBridge />
      <ChatMessagesCacheBridge />
      <ChatIncomingMessageToastBridge />
    </>
  );
}
