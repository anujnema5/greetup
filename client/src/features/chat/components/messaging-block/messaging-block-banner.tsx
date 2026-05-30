'use client';

import Link from 'next/link';
import { Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CHAT_HORIZONTAL_PADDING } from '../../constants';
import type { MessagingBlock } from '../../types/messaging-block.types';
import { useMessagingBlockState } from '../../hooks/use-messaging-block-state';

type MessagingBlockBannerProps = {
  messagingBlock?: MessagingBlock;
  className?: string;
};

export function MessagingBlockBanner({ messagingBlock, className }: MessagingBlockBannerProps) {
  const { bannerText, reason } = useMessagingBlockState(messagingBlock);
  if (!bannerText) return null;

  return (
    <div
      className={cn(
        'flex shrink-0 items-start gap-2.5 border-t border-border/70 bg-muted/35 py-2.5 text-[13px] leading-snug text-muted-foreground',
        CHAT_HORIZONTAL_PADDING,
        className,
      )}
      role="status"
    >
      <Ban className="mt-0.5 size-4 shrink-0 text-muted-foreground/70" strokeWidth={2} aria-hidden />
      <p className="min-w-0 flex-1">
        {bannerText}
        {reason === 'you_blocked' ? (
          <>
            {' '}
            <Link
              href="/settings"
              className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
            >
              Open Settings
            </Link>
          </>
        ) : null}
      </p>
    </div>
  );
}
