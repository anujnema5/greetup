'use client';

import { useState, useRef, useLayoutEffect, KeyboardEvent } from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MAX_MESSAGE_CONTENT_LENGTH,
  MESSAGE_INPUT_MAX_HEIGHT_PX,
  MESSAGE_INPUT_MIN_HEIGHT_PX,
} from '../constants';
import { useTyping } from '../hooks/use-typing';
import type { Message } from '../types/chat.types';

interface MessageInputProps {
  conversationId: string;
  replyTo: Message | null;
  onCancelReply: () => void;
  onSend: (content: string, replyToId?: string) => void;
  disabled?: boolean;
}

function MessageTooLongDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Message too long</DialogTitle>
        </DialogHeader>
        <Alert className="border-0 bg-transparent p-0 shadow-none">
          <AlertCircle className="text-amber-600 dark:text-amber-500" />
          <AlertDescription>
            Chat messages are limited to {MAX_MESSAGE_CONTENT_LENGTH.toLocaleString()}{' '}
            characters. Shorten your message and try again.
          </AlertDescription>
        </Alert>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MessageInput({
  conversationId,
  replyTo,
  onCancelReply,
  onSend,
  disabled,
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [tooLongDialogOpen, setTooLongDialogOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { onInputChange, stopTyping } = useTyping(conversationId);

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(
      Math.max(el.scrollHeight, MESSAGE_INPUT_MIN_HEIGHT_PX),
      MESSAGE_INPUT_MAX_HEIGHT_PX,
    );
    el.style.height = `${next}px`;
  }, [text]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    if (trimmed.length > MAX_MESSAGE_CONTENT_LENGTH) {
      setTooLongDialogOpen(true);
      return;
    }

    onSend(trimmed, replyTo?.id);
    setText('');
    stopTyping();
    onCancelReply();
    inputRef.current?.focus();
  };

  const handleTextChange = (raw: string) => {
    if (raw.length > MAX_MESSAGE_CONTENT_LENGTH) {
      setTooLongDialogOpen(true);
      setText(raw.slice(0, MAX_MESSAGE_CONTENT_LENGTH));
    } else {
      setText(raw);
    }
    onInputChange();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="shrink-0 border-t border-border bg-background/95 px-3 py-3 backdrop-blur-sm md:px-4">
      <MessageTooLongDialog open={tooLongDialogOpen} onOpenChange={setTooLongDialogOpen} />

      {replyTo && (
        <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground border-l-2 border-primary pl-2">
          <span className="truncate flex-1">
            Replying: {replyTo.content.slice(0, 60)}
          </span>
          <button
            type="button"
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
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none bg-muted rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary max-h-32 overflow-y-auto disabled:opacity-50"
          style={{
            minHeight: MESSAGE_INPUT_MIN_HEIGHT_PX,
            maxHeight: MESSAGE_INPUT_MAX_HEIGHT_PX,
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className="shrink-0 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 cursor-pointer transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 2L11 13" />
            <path d="M22 2L15 22l-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
