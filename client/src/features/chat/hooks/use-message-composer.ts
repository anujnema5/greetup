'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { MAX_MESSAGE_CONTENT_LENGTH, MESSAGE_INPUT_MAX_HEIGHT_PX } from '../constants';
import { useTyping } from './use-typing';
import type { Message } from '../types/chat.types';

/** Single-line text box height (leading-5); must match textarea `leading-5`. */
const INPUT_LINE_HEIGHT_PX = 20;

interface UseMessageComposerOptions {
  conversationId: string;
  replyTo: Message | null;
  onCancelReply: () => void;
  onSend: (content: string, replyToId?: string) => void;
  disabled?: boolean;
  typingEnabled?: boolean;
}

export function useMessageComposer({
  conversationId,
  replyTo,
  onCancelReply,
  onSend,
  disabled,
  typingEnabled = true,
}: UseMessageComposerOptions) {
  const [text, setText] = useState('');
  const [tooLongDialogOpen, setTooLongDialogOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { onInputChange, stopTyping } = useTyping(conversationId, { enabled: typingEnabled });

  const isMultiline = text.includes('\n');

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
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, MESSAGE_INPUT_MAX_HEIGHT_PX);
    el.style.height = `${Math.max(next, INPUT_LINE_HEIGHT_PX)}px`;
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
    let next = raw;
    if (raw.length > MAX_MESSAGE_CONTENT_LENGTH) {
      setTooLongDialogOpen(true);
      next = raw.slice(0, MAX_MESSAGE_CONTENT_LENGTH);
    }
    setText(next);
    onInputChange(next.trim().length > 0);
  };

  const handleBlur = () => {
    stopTyping();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = !!text.trim() && !disabled;

  return {
    text,
    inputRef,
    isMultiline,
    canSend,
    tooLongDialogOpen,
    setTooLongDialogOpen,
    handleSend,
    handleTextChange,
    handleKeyDown,
    handleBlur,
  };
}
