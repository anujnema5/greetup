'use client';

import { cn } from '@/lib/utils';

type OnlinePresenceDotProps = {
  isOnline: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Border color around the dot — match the avatar background. */
  borderClassName?: string;
};

const sizeClass = {
  sm: 'size-2 border',
  md: 'size-2.5 border-2',
  lg: 'size-3 border-2',
} as const;

/** Green circle shown on avatars when the user is online. */
export function OnlinePresenceDot({
  isOnline,
  className,
  size = 'md',
  borderClassName = 'border-background',
}: OnlinePresenceDotProps) {
  if (!isOnline) return null;

  return (
    <span
      className={cn(
        'rounded-full bg-emerald-500',
        sizeClass[size],
        borderClassName,
        className,
      )}
      aria-label="Online"
      title="Online"
    />
  );
}
