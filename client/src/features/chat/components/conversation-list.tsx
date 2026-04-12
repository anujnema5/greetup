'use client';

import { useSelector } from 'react-redux';
import { useListConversationsQuery } from '../api/chat-api';
import type { RootState } from '@/lib/redux/store';
import type { Conversation } from '../types/chat.types';

interface ConversationListProps {
  activeId: string | null;
  onSelect: (conv: Conversation) => void;
}

const TYPE_LABELS: Record<string, string> = {
  room_direct:  'Direct',
  room_circle:  'Circle',
  connection:   'DM',
};

export function ConversationList({ activeId, onSelect }: ConversationListProps) {
  const { data: conversations = [], isLoading } = useListConversationsQuery();
  console.log('Conversations:', conversations); // Debug log
  
  const unreadCounts = useSelector((s: RootState) => s.chat.unreadCounts);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!conversations.length) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-sm text-muted-foreground">
        No conversations yet
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-y-auto">
      {conversations.map((conv) => {
        const unread = unreadCounts[conv.id] ?? 0;
        const isActive = conv.id === activeId;

        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv)}
            className={`
              flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer
              hover:bg-muted/60
              ${isActive ? 'bg-muted' : ''}
            `}
          >
            {/* Avatar placeholder */}
            <div className="shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
              {TYPE_LABELS[conv.type]?.charAt(0) ?? '?'}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate">
                  {TYPE_LABELS[conv.type] ?? conv.type}
                </span>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {new Date(conv.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground truncate">
                  {conv.participants.length} participant{conv.participants.length !== 1 ? 's' : ''}
                </span>
                {unread > 0 && (
                  <span className="shrink-0 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
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
