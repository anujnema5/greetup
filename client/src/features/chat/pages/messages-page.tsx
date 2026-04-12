'use client';

import { useState } from 'react';
import { ChevronLeft, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NavSidebar, BottomNav } from '@/features/app-shell';
import { useSession } from '@/lib/auth-client';
import { cn } from '@/lib/utils';
import { ChatPanel } from '../components/chat-panel';
import { ChatThreadHeader } from '../components/chat-thread-header';
import { ConversationList } from '../components/conversation-list';
import { NewConversationSearch } from '../components/new-conversation-search';
import type { Conversation } from '../types/chat.types';

export function MessagesPage() {
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? '';

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <NavSidebar activePath="/messages" />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden pb-16 md:pb-0">
        <header className="sticky top-0 z-40 flex shrink-0 items-center border-b border-border bg-background/95 px-4 py-4 shadow-sm backdrop-blur-md md:px-8">
          <div>
            <h1 className="text-[15px] font-semibold leading-none text-foreground">Messages</h1>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Chats from connections, circles, and direct rooms.
            </p>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col px-3 py-3 md:px-6 md:py-5">
          <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card/40 shadow-sm dark:bg-card/25">
            <aside
              className={cn(
                'flex min-h-0 w-full shrink-0 flex-col border-border bg-card/70 md:w-[min(100%,20rem)] md:border-r md:bg-card/50',
                activeConv ? 'hidden md:flex' : 'flex',
              )}
            >
              <div className="shrink-0 border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">Inbox</h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Select a thread or message a connection.
                </p>
              </div>
              <NewConversationSearch onConversationOpen={setActiveConv} />
              <div className="min-h-0 flex-1 overflow-y-auto">
                <ConversationList
                  activeId={activeConv?.id ?? null}
                  onSelect={setActiveConv}
                />
              </div>
            </aside>

            <section
              className={cn(
                'flex min-h-0 min-w-0 flex-1 flex-col bg-background',
                !activeConv ? 'hidden md:flex' : 'flex',
              )}
            >
              {activeConv ? (
                <>
                  <div className="flex shrink-0 items-center gap-2 border-b border-border bg-background/90 px-2 py-2 backdrop-blur-md md:gap-3 md:px-4 md:py-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 rounded-xl md:hidden"
                      onClick={() => setActiveConv(null)}
                      aria-label="Back to conversations"
                    >
                      <ChevronLeft className="size-5" strokeWidth={2} />
                    </Button>
                    <ChatThreadHeader
                      conversation={activeConv}
                      currentUserId={currentUserId}
                    />
                  </div>
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                    <ChatPanel
                      conversationId={activeConv.id}
                      conversationType={activeConv.type}
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner shadow-primary/5">
                    <MessageCircle className="size-7 opacity-90" strokeWidth={1.75} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Select a conversation</p>
                    <p className="mx-auto max-w-[260px] text-xs text-muted-foreground">
                      Choose someone from your inbox to read and send messages.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <BottomNav activePath="/messages" />
    </div>
  );
}
