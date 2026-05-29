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
}

export function useMessageComposer({
  conversationId,
  replyTo,
  onCancelReply,
  onSend,
  disabled,
}: UseMessageComposerOptions) {
  const [text, setText] = useState('');
  const [tooLongDialogOpen, setTooLongDialogOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { onInputChange, stopTyping } = useTyping(conversationId);

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
    el.style.height = `${INPUT_LINE_HEIGHT_PX}px`;
    const next = Math.min(
      Math.max(el.scrollHeight, INPUT_LINE_HEIGHT_PX),
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
  };
}
