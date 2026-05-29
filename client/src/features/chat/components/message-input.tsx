'use client';

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
import { useMessageComposer } from '../hooks/use-message-composer';
import { replyComposerPreview } from '../lib/message-display';
import type { Message } from '../types/chat.types';

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
  const {
    text,
    inputRef,
    isMultiline,
    canSend,
    tooLongDialogOpen,
    setTooLongDialogOpen,
    handleSend,
    handleTextChange,
    handleKeyDown,
  } = useMessageComposer({
    conversationId,
    replyTo,
    onCancelReply,
    onSend,
    disabled,
  });

  const replyPreview = replyTo ? replyComposerPreview(replyTo, currentUserId) : null;

  return (
    <div
      className={cn(
        'shrink-0 border-t border-border/70 bg-background/95 backdrop-blur-md',
        CHAT_HORIZONTAL_PADDING,
        'py-3 sm:py-3.5',
      )}
    >
      <MessageTooLongDialog open={tooLongDialogOpen} onOpenChange={setTooLongDialogOpen} />

      {replyPreview && (
        <div className="mb-2.5 flex items-start gap-2 rounded-2xl border border-border/60 bg-muted/40 px-3 py-2">
          <div className="min-w-0 flex-1 border-l-2 border-primary pl-2.5">
            <p className="truncate text-[12px] font-semibold leading-tight text-foreground/85">
              {replyPreview.senderName}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
              {replyPreview.preview}
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
