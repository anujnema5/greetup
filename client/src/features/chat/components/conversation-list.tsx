'use client';

import { useSelector } from 'react-redux';
import { useSession } from '@/lib/auth-client';
import { cn } from '@/lib/utils';
import { useListConversationsQuery } from '../api/chat-api';
import {
  conversationDisplayTitle,
  conversationListSubtitle,
  conversationListAvatar,
  formatConversationUpdatedAt,
} from '../lib/conversation-display';
import type { RootState } from '@/lib/redux/store';
import type { Conversation } from '../types/chat.types';

interface ConversationListProps {
  activeId: string | null;
  onSelect: (conv: Conversation) => void;
}

export function ConversationList({ activeId, onSelect }: ConversationListProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? '';

  const { data: conversations = [], isLoading } = useListConversationsQuery();

  const unreadCounts = useSelector((s: RootState) => s.chat.unreadCounts);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-2 md:p-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-13 rounded-xl bg-muted/80 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!conversations.length) {
    return (
      <div className="flex h-40 flex-col items-center justify-center px-4 text-center text-sm text-muted-foreground">
        No conversations yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 overflow-y-auto p-2 md:p-3">
      {conversations.map((conv) => {
        const unread = unreadCounts[conv.id] ?? conv.unreadCount ?? 0;
        const isActive = conv.id === activeId;
        const title = conversationDisplayTitle(conv, currentUserId);
        const subtitle = conversationListSubtitle(conv);
        const { image, label } = conversationListAvatar(conv, currentUserId);

        return (
          <button
            key={conv.id}
            type="button"
            onClick={() => onSelect(conv)}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200',
              'hover:bg-muted/70',
              isActive && 'bg-primary/10 text-foreground ring-1 ring-primary/25 shadow-sm',
            )}
          >
            <div
              className={cn(
                'flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full',
                'bg-linear-to-br from-primary/70 to-primary text-xs font-bold text-primary-foreground',
              )}
            >
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="" className="size-full object-cover" />
              ) : (
                label
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-foreground">{title}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                  {formatConversationUpdatedAt(conv.updatedAt)}
                </span>
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
                {unread > 0 && (
                  <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
