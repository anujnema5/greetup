'use client';

import { useState } from 'react';
import { ConversationList } from '../components/conversation-list';
import { ChatPanel } from '../components/chat-panel';
import { NewConversationSearch } from '../components/new-conversation-search';
import type { Conversation } from '../types/chat.types';

export function MessagesPage() {
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);

  return (
    <div className="flex h-[calc(100vh-4rem)] border rounded-xl overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-72 shrink-0 border-r flex flex-col">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold text-sm">Messages</h2>
        </div>
        <NewConversationSearch onConversationOpen={setActiveConv} />
        <div className="flex-1 overflow-y-auto">
          <ConversationList
            activeId={activeConv?.id ?? null}
            onSelect={setActiveConv}
          />
        </div>
      </aside>

      {/* Main area */}
      <main className="flex-1 flex flex-col min-w-0">
        {activeConv ? (
          <ChatPanel conversationId={activeConv.id} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-30">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p className="text-sm">Select a conversation to start chatting</p>
          </div>
        )}
      </main>
    </div>
  );
}
