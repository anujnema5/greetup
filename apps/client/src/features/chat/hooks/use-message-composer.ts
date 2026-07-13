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

  const [isMultiline, setIsMultiline] = useState(false);

  const focusInput = useCallback(() => {
    if (disabled) return;
    inputRef.current?.focus({ preventScroll: true });
  }, [disabled]);

  // Do not autofocus on open — mobile keyboards should only appear after a tap
  // (Instagram-style). Still refocus for reply / after send while composing.
  useEffect(() => {
    if (replyTo) focusInput();
  }, [replyTo, focusInput]);

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    // Collapse first so scrollHeight reflects wrapped content within the real width.
    el.style.height = '0px';
    const next = Math.min(Math.max(el.scrollHeight, INPUT_LINE_HEIGHT_PX), MESSAGE_INPUT_MAX_HEIGHT_PX);
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
