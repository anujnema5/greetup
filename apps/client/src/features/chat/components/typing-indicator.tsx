'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { Message, MessageAvatar, MessageContent } from '@/components/ui/message';
import { MESSAGE_AVATAR_CLASS } from '../constants';
import { MessageSenderAvatar } from './message-sender-avatar';
import type { ConversationType, Message as ChatMessage } from '../types/chat.types';

/** Keep in sync with `.typing-indicator-shell` / exit animation in `globals.css`. */
const TYPING_INDICATOR_TRANSITION_MS = 260;

interface TypingIndicatorProps {
  userIds: string[];
  conversationType?: ConversationType;
  peerMessage?: ChatMessage | null;
  senderIsOnline?: boolean;
  className?: string;
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
            "size-1.5 rounded-full bg-muted-foreground/70",
            !paused && "animate-typing-dot",
            !paused && delay === 0 && "delay-0",
            !paused && delay === 180 && "delay-[180ms]",
            !paused && delay === 360 && "delay-[360ms]",
          )}
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
  className,
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

  const isGroup = conversationType === 'room_space';
  const showDirectPeerAvatar = !isGroup && !!peerMessage;
  const showPeerColumnGutter = isGroup || !showDirectPeerAvatar;

  const a11yLabel =
    active.length === 1 ? 'Someone is typing' : `${active.length} people are typing`;

  return (
    <div className={cn('typing-indicator-shell pt-2 pb-2', shouldShow && 'is-open', className)}>
      <div className="typing-indicator-shell-inner">
        <Message
          align="start"
          className={cn(
            exiting ? 'animate-typing-indicator-exit' : 'animate-typing-indicator-enter',
            showPeerColumnGutter ? 'items-end' : 'items-start',
            exiting && 'pointer-events-none',
          )}
          role="status"
          aria-live="polite"
          aria-label={a11yLabel}
          aria-hidden={exiting}
        >
          {showDirectPeerAvatar ? (
            <MessageAvatar>
              <MessageSenderAvatar message={peerMessage} isOnline={senderIsOnline} />
            </MessageAvatar>
          ) : showPeerColumnGutter ? (
            <MessageAvatar aria-hidden className={cn(MESSAGE_AVATAR_CLASS, 'invisible')} />
          ) : null}
          <MessageContent>
            <Bubble variant="muted">
              <BubbleContent>
                <TypingDots paused={exiting} />
              </BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
      </div>
    </div>
  );
}
