'use client';

import { cn } from '@/lib/utils';
import {
  conversationDisplayTitle,
  conversationListAvatar,
  conversationMetaSubtitle,
} from '../lib/conversation-display';
import type { Conversation } from '../types/chat.types';

type ChatThreadHeaderProps = {
  conversation: Conversation;
  currentUserId: string;
  className?: string;
};

/** Large avatar + titles for the active thread (desktop + mobile). */
export function ChatThreadHeader({
  conversation,
  currentUserId,
  className,
}: ChatThreadHeaderProps) {
  const title = conversationDisplayTitle(conversation, currentUserId);
  const subtitle = conversationMetaSubtitle(conversation);
  const { image, label } = conversationListAvatar(conversation, currentUserId);

  return (
    <div className={cn('flex min-w-0 flex-1 items-center gap-3', className)}>
      <div
        className={cn(
          'flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl',
          'bg-linear-to-br from-primary/70 to-primary text-sm font-semibold text-primary-foreground',
          'ring-1 ring-border/60 shadow-sm',
        )}
        aria-hidden
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="size-full object-cover" />
        ) : (
          label
        )}
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <h2 className="truncate text-sm font-semibold leading-tight text-foreground">{title}</h2>
        <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
