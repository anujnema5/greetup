'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useUserOnlineStatus } from '../hooks/use-peers-online-status';
import { OnlinePresenceDot } from './online-presence-dot';

type UserAvatarWithPresenceProps = {
  children: ReactNode;
  className?: string;
  /** When set, presence is fetched for this user (unless `isOnline` is passed). */
  userId?: string | null;
  /** Explicit online flag — use when batching status in a parent list. */
  isOnline?: boolean;
  dotSize?: 'sm' | 'md' | 'lg';
  borderClassName?: string;
};

/**
 * Wraps an avatar and overlays an online indicator when the user is online.
 * Pass `isOnline` from a batched query in lists; pass `userId` alone on profile views.
 */
export function UserAvatarWithPresence({
  children,
  className,
  userId,
  isOnline: isOnlineProp,
  dotSize = 'md',
  borderClassName,
}: UserAvatarWithPresenceProps) {
  const { isOnline: fromHook } = useUserOnlineStatus(
    isOnlineProp !== undefined ? null : userId,
  );
  const isOnline = isOnlineProp ?? fromHook;

  return (
    <div className={cn('relative shrink-0', className)}>
      {children}
      <OnlinePresenceDot
        isOnline={isOnline}
        size={dotSize}
        borderClassName={borderClassName}
        className="absolute bottom-0 right-0"
      />
    </div>
  );
}
