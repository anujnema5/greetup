'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { useTyping } from '../hooks/use-typing';
import type { Message } from '../types/chat.types';

interface MessageInputProps {
  conversationId: string;
  replyTo: Message | null;
  onCancelReply: () => void;
  onSend: (content: string, replyToId?: string) => void;
  disabled?: boolean;
}

export function MessageInput({
  conversationId,
  replyTo,
  onCancelReply,
  onSend,
  disabled,
}: MessageInputProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { onInputChange, stopTyping } = useTyping(conversationId);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed, replyTo?.id);
    setText('');
    stopTyping();
    onCancelReply();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="shrink-0 border-t border-border bg-background/95 px-3 py-3 backdrop-blur-sm md:px-4">
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground border-l-2 border-primary pl-2">
          <span className="truncate flex-1">
            Replying: {replyTo.content.slice(0, 60)}
          </span>
          <button
            className="hover:text-foreground cursor-pointer"
            onClick={onCancelReply}
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onInputChange();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none bg-muted rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary max-h-32 overflow-y-auto disabled:opacity-50"
          style={{ minHeight: '44px' }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className="shrink-0 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 cursor-pointer transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 2L11 13" /><path d="M22 2L15 22l-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
