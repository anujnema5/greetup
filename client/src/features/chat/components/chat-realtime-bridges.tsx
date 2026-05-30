'use client';

import { ChatInboxSocketBridge } from './chat-inbox-socket-bridge';
import { ChatIncomingMessageToastBridge } from './chat-incoming-message-toast-bridge';
import { ChatMessagesCacheBridge } from './chat-messages-cache-bridge';
import { ChatMessagingBlockBridge } from './messaging-block/chat-messaging-block-bridge';

/** Mount once in root layout — wires chat socket listeners (inbox, cache, toasts, blocks). */
export function ChatRealtimeBridges() {
  return (
    <>
      <ChatInboxSocketBridge />
      <ChatMessagingBlockBridge />
      <ChatMessagesCacheBridge />
      <ChatIncomingMessageToastBridge />
    </>
  );
}
