'use client';

import Image from 'next/image';
import { nameInitials } from '@/lib/utils/name-initials';
import { cn } from '@/lib/utils';
import { UserAvatarWithPresence } from '@/features/presence';
import { MESSAGE_AVATAR_CLASS } from '../constants';
import { senderLabel } from '../lib/message-display';
import type { Message } from '../types/chat.types';

export function MessageSenderAvatar({
  message,
  isOnline,
}: {
  message: Message;
  isOnline?: boolean;
}) {
  return (
    <UserAvatarWithPresence
      userId={message.senderId}
      isOnline={isOnline}
      className={MESSAGE_AVATAR_CLASS}
      borderClassName="border-background"
      dotSize="sm"
    >
      <div
        className={cn(
          'relative flex items-center justify-center overflow-hidden rounded-full',
          MESSAGE_AVATAR_CLASS,
          'bg-linear-to-br from-primary/50 to-primary text-xs font-semibold text-primary-foreground',
        )}
      >
        {message.sender?.image ? (
          <Image
            src={message.sender.image}
            alt=""
            fill
            sizes="36px"
            className="size-full object-cover"
            unoptimized
          />
        ) : (
          nameInitials(senderLabel(message))
        )}
      </div>
    </UserAvatarWithPresence>
  );
}
