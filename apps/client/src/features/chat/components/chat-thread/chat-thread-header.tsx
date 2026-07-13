'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { UserAvatarWithPresence, useUserOnlineStatus } from '@/features/presence';
import {
  conversationDisplayTitle,
  conversationListAvatar,
  conversationMetaSubtitle,
} from '../../lib/conversation-display';
import { getDmPeerProfileHref, getDmPeerUserId } from '../../lib/conversation-peers';
import type { Conversation } from '../../types/chat.types';

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
  const baseSubtitle = conversationMetaSubtitle(conversation);
  const { image, label } = conversationListAvatar(conversation, currentUserId);
  const peerUserId = getDmPeerUserId(conversation, currentUserId);
  const profileHref = getDmPeerProfileHref(conversation, currentUserId);
  const { isOnline } = useUserOnlineStatus(peerUserId);

  const subtitle =
    peerUserId && isOnline ? 'Online' : peerUserId && !isOnline ? baseSubtitle : baseSubtitle;

  const inner = (
    <>
      <UserAvatarWithPresence
        userId={peerUserId}
        isOnline={peerUserId ? isOnline : false}
        borderClassName="border-background"
        dotSize="md"
      >
        <div
          className={cn(
            'flex size-11 items-center justify-center overflow-hidden rounded-2xl',
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
      </UserAvatarWithPresence>
      <div className="min-w-0 flex-1 py-0.5">
        <h2 className="truncate text-sm font-semibold leading-tight text-foreground">{title}</h2>
        <p
          className={cn(
            'mt-0.5 truncate text-[11px] leading-tight',
            isOnline && peerUserId ? 'font-medium text-emerald-500' : 'text-muted-foreground',
          )}
        >
          {subtitle}
        </p>
      </div>
    </>
  );

  return (
    <div className={cn('min-w-0 flex-1', className)}>
      {profileHref ? (
        <Link href={profileHref} className="flex min-w-0 items-center gap-3">
          {inner}
        </Link>
      ) : (
        <div className="flex min-w-0 items-center gap-3">{inner}</div>
      )}
    </div>
  );
}
