'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  MESSAGE_AVATAR_CLASS,
  MESSAGE_BUBBLE_PAD_CLASS,
  MESSAGE_ROW_GAP,
} from '../constants';
import { bubbleCornerRadius } from '../lib/message-display';
import { MessageSenderAvatar } from './message-sender-avatar';
import type { ConversationType, Message } from '../types/chat.types';

/** Keep in sync with `.typing-indicator-shell` / exit animation in `globals.css`. */
const TYPING_INDICATOR_TRANSITION_MS = 260;

interface TypingIndicatorProps {
  userIds: string[];
  conversationType?: ConversationType;
  peerMessage?: Message | null;
  senderIsOnline?: boolean;
}

function getTransitionDurationMs(): number {
  if (typeof window === 'undefined') return TYPING_INDICATOR_TRANSITION_MS;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 0
    : TYPING_INDICATOR_TRANSITION_MS;
}

function TypingDots({ paused }: { paused: boolean }) {
  return (
    <span className="flex h-5 items-center gap-1" aria-hidden>
      {[0, 180, 360].map((delay) => (
        <span
          key={delay}
          className={cn(
            'size-1.5 rounded-full bg-muted-foreground/70',
            !paused && 'animate-typing-dot',
          )}
          style={paused ? undefined : { animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

export function TypingIndicator({
  userIds,
  conversationType,
  peerMessage = null,
  senderIsOnline,
}: TypingIndicatorProps) {
  const active = userIds.filter(Boolean);
  const shouldShow = active.length > 0;

  const [render, setRender] = useState(shouldShow);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (shouldShow) {
      setExiting(false);
      setRender(true);
      return;
    }

    if (!render) return;

    const duration = getTransitionDurationMs();
    if (duration === 0) {
      setRender(false);
      setExiting(false);
      return;
    }

    setExiting(true);
    const id = window.setTimeout(() => {
      setRender(false);
      setExiting(false);
    }, duration);

    return () => window.clearTimeout(id);
  }, [shouldShow, render]);

  if (!render) return null;

  const isGroup = conversationType === 'room_circle';
  const showDirectPeerAvatar = !isGroup && !!peerMessage;
  const showPeerColumnGutter = isGroup || !showDirectPeerAvatar;

  const a11yLabel =
    active.length === 1 ? 'Someone is typing' : `${active.length} people are typing`;

  return (
    <div className={cn('typing-indicator-shell', shouldShow && 'is-open')}>
      <div className="typing-indicator-shell-inner">
        <div
          className={cn(
            'mt-2 flex w-full min-w-0 max-w-full justify-start overflow-hidden',
            exiting ? 'animate-typing-indicator-exit' : 'animate-typing-indicator-enter',
            MESSAGE_ROW_GAP,
            showPeerColumnGutter ? 'items-end' : 'items-start',
            exiting && 'pointer-events-none',
          )}
          role="status"
          aria-live="polite"
          aria-label={a11yLabel}
          aria-hidden={exiting}
        >
          {showDirectPeerAvatar ? (
            <MessageSenderAvatar message={peerMessage} isOnline={senderIsOnline} />
          ) : showPeerColumnGutter ? (
            <div className={cn(MESSAGE_AVATAR_CLASS, 'shrink-0')} aria-hidden />
          ) : null}
          <div
            className={cn(
              'w-fit bg-muted text-foreground',
              MESSAGE_BUBBLE_PAD_CLASS,
              bubbleCornerRadius(false, 'last'),
            )}
          >
            <TypingDots paused={exiting} />
          </div>
        </div>
      </div>
    </div>
  );
}
