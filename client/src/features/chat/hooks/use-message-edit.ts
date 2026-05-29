'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MAX_MESSAGE_CONTENT_LENGTH } from '../constants';
import type { Message } from '../types/chat.types';

interface UseMessageEditOptions {
  message: Message;
  editingMessageId?: string | null;
  onEditMessage?: (messageId: string, content: string) => void;
  onEditingChange?: (messageId: string | null) => void;
}

export function useMessageEdit({
  message,
  editingMessageId = null,
  onEditMessage,
  onEditingChange,
}: UseMessageEditOptions) {
  const [editing, setEditing] = useState(false);
  /** Only used while `editing`; seeded in `startEdit` from `message.content`. */
  const [draft, setDraft] = useState('');
  const editRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (!editing || !editRef.current) return;
    const el = editRef.current;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [editing, draft]);

  useEffect(() => {
    if (!editing) return;
    const node = editRef.current?.closest('[data-message-row]');
    node?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [editing]);

  const saveEdit = () => {
    const next = draft.trim();
    if (!next || next.length > MAX_MESSAGE_CONTENT_LENGTH) return;
    onEditMessage?.(message.id, next);
    setEditing(false);
    onEditingChange?.(null);
  };

  const cancelEdit = () => {
    setEditing(false);
    onEditingChange?.(null);
  };

  const startEdit = () => {
    setDraft(message.content);
    setEditing(true);
    onEditingChange?.(message.id);
  };

  const actionsLocked = editingMessageId !== null && editingMessageId !== message.id;

  return {
    editing,
    draft,
    setDraft,
    editRef,
    saveEdit,
    cancelEdit,
    startEdit,
    actionsLocked,
  };
}
