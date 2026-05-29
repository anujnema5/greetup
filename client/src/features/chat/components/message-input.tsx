'use client';

import { useCallback, useEffect, useState, useRef, useLayoutEffect, KeyboardEvent } from 'react';
import { AlertCircle, ArrowUp, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  CHAT_HORIZONTAL_PADDING,
  MAX_MESSAGE_CONTENT_LENGTH,
  MESSAGE_INPUT_MAX_HEIGHT_PX,
} from '../constants';
import { useTyping } from '../hooks/use-typing';
import type { Message } from '../types/chat.types';

/** Single-line text box height (leading-5); must match textarea `leading-5`. */
const INPUT_LINE_HEIGHT_PX = 20;

interface MessageInputProps {
  conversationId: string;
  currentUserId: string;
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
  currentUserId,
  replyTo,
  onCancelReply,
  onSend,
  disabled,
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [tooLongDialogOpen, setTooLongDialogOpen] = useState(false);
  const [isMultiline, setIsMultiline] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { onInputChange, stopTyping } = useTyping(conversationId);

  const focusInput = useCallback(() => {
    if (disabled) return;
    inputRef.current?.focus({ preventScroll: true });
  }, [disabled]);

  useEffect(() => {
    const t = window.setTimeout(focusInput, 50);
    return () => window.clearTimeout(t);
  }, [conversationId, focusInput]);

  useEffect(() => {
    if (replyTo) focusInput();
  }, [replyTo, focusInput]);

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = `${INPUT_LINE_HEIGHT_PX}px`;
    const next = Math.min(
      Math.max(el.scrollHeight, INPUT_LINE_HEIGHT_PX),
      MESSAGE_INPUT_MAX_HEIGHT_PX,
    );
    el.style.height = `${next}px`;
    setIsMultiline(next > INPUT_LINE_HEIGHT_PX + 2);
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
    focusInput();
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

  const canSend = !!text.trim() && !disabled;

  return (
    <div
      className={cn(
        'shrink-0 border-t border-border/70 bg-background/95 backdrop-blur-md',
        CHAT_HORIZONTAL_PADDING,
        'py-3 sm:py-3.5',
      )}
    >
      <MessageTooLongDialog open={tooLongDialogOpen} onOpenChange={setTooLongDialogOpen} />

      {replyTo && (
        <div className="mb-2.5 flex items-start gap-2 rounded-2xl border border-border/60 bg-muted/40 px-3 py-2">
          <div className="min-w-0 flex-1 border-l-2 border-primary pl-2.5">
            <p className="truncate text-[12px] font-semibold leading-tight text-foreground/85">
              {replyTo.senderId === currentUserId
                ? 'You'
                : replyTo.sender?.displayName?.trim() || replyTo.sender?.name || 'Someone'}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
              {replyTo.isDeleted
                ? 'Message unavailable'
                : replyTo.content.trim().slice(0, 100) || 'Empty message'}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7 shrink-0 cursor-pointer rounded-full text-muted-foreground hover:text-foreground"
            onClick={onCancelReply}
            aria-label="Cancel reply"
          >
            <X className="size-4" strokeWidth={2} />
          </Button>
        </div>
      )}

      <div
        className={cn(
          'flex min-h-11 w-full gap-1 rounded-full border border-border/60 bg-muted/50 pl-4 pr-1.5 shadow-sm transition-[box-shadow,border-color]',
          'focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15',
          isMultiline ? 'items-end py-1.5' : 'items-center',
          disabled && 'opacity-60',
        )}
      >
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message…"
          rows={1}
          disabled={disabled}
          aria-label="Message"
          className="min-w-0 flex-1 resize-none overflow-y-auto bg-transparent text-[15px] leading-5 text-foreground outline-none placeholder:text-muted-foreground/55 disabled:cursor-not-allowed"
          style={{ maxHeight: MESSAGE_INPUT_MAX_HEIGHT_PX }}
        />
        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          className={cn(
            'size-8 shrink-0 cursor-pointer rounded-full transition-colors',
            isMultiline && 'mb-0.5',
            canSend
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'cursor-not-allowed bg-muted-foreground/15 text-muted-foreground/40',
          )}
        >
          <ArrowUp className="size-[17px] rotate-45" strokeWidth={2.5} />
        </Button>
      </div>
    </div>
  );
}
