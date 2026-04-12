'use client';

import { useState } from 'react';
import type { Message } from '../types/chat.types';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  onReact?: (messageId: string, emoji: string) => void;
  onReply?: (message: Message) => void;
}

const STATUS_ICONS: Record<string, string> = {
  sending:   '⏳',
  delivered: '✓',
  read:      '✓✓',
  failed:    '✗',
};

export function MessageBubble({ message, isOwn, onReact, onReply }: MessageBubbleProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  if (message.messageType === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
          {String(message.systemPayload ?? '')}
        </span>
      </div>
    );
  }

  const content = message.isDeleted
    ? message.deletedForAll
      ? 'This message was deleted'
      : 'You deleted this message'
    : message.content;

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group mb-1`}
      onMouseLeave={() => setMenuOpen(false)}
    >
      <div className="relative max-w-[75%]">
        {/* Reply preview */}
        {message.replyToId && (
          <div className="mb-1 text-xs text-muted-foreground border-l-2 border-primary pl-2 truncate">
            Replying to a message
          </div>
        )}

        <div
          className={`
            rounded-2xl px-3 py-2 text-sm
            ${isOwn
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-muted text-foreground rounded-tl-sm'}
            ${message.isDeleted ? 'italic opacity-60' : ''}
          `}
        >
          {content}

          {message.editedAt && !message.isDeleted && (
            <span className="ml-1 text-[10px] opacity-60">(edited)</span>
          )}

          <div className={`flex items-center justify-end gap-1 mt-0.5 text-[10px] opacity-60`}>
            <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            {isOwn && message.status && (
              <span>{STATUS_ICONS[message.status] ?? ''}</span>
            )}
          </div>
        </div>

        {/* Quick reaction / reply row — visible on hover */}
        {!message.isDeleted && (
          <div className={`
            absolute top-1/2 -translate-y-1/2 hidden group-hover:flex gap-1
            ${isOwn ? 'right-full mr-1' : 'left-full ml-1'}
          `}>
            {onReply && (
              <button
                className="text-xs bg-muted rounded-full p-1 hover:bg-muted/80 cursor-pointer"
                onClick={() => onReply(message)}
                title="Reply"
              >
                ↩
              </button>
            )}
            {onReact && (
              <button
                className="text-xs bg-muted rounded-full p-1 hover:bg-muted/80 cursor-pointer"
                onClick={() => onReact(message.id, '👍')}
                title="React"
              >
                😊
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
