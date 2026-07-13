'use client';

import type { ReactNode } from 'react';
import { Phone, PhoneIncoming, PhoneMissed, PhoneOff, Video, VideoOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatCallSystemMessage,
  isConnectionCallSystemPayload,
  type ConnectionCallSystemPayload,
} from '../lib/call-system-message';

type CallSystemMessageProps = {
  payload: ConnectionCallSystemPayload;
  currentUserId: string;
};

function CallIcon({ payload, missed }: { payload: ConnectionCallSystemPayload; missed: boolean }) {
  const className = cn('size-3.5 shrink-0', missed ? 'text-destructive' : 'text-muted-foreground');
  if (payload.mode === 'video') {
    if (payload.status === 'completed') return <Video className={className} strokeWidth={2.25} />;
    if (missed) return <VideoOff className={className} strokeWidth={2.25} />;
    return <Video className={className} strokeWidth={2.25} />;
  }
  if (payload.status === 'completed') return <Phone className={className} strokeWidth={2.25} />;
  if (missed) return <PhoneMissed className={className} strokeWidth={2.25} />;
  if (payload.status === 'declined' || payload.status === 'cancelled') {
    return <PhoneOff className={className} strokeWidth={2.25} />;
  }
  return <PhoneIncoming className={className} strokeWidth={2.25} />;
}

export function CallSystemMessage({ payload, currentUserId }: CallSystemMessageProps) {
  const { label, tone } = formatCallSystemMessage(payload, currentUserId);
  const missed = tone === 'missed';

  return (
    <div className="flex justify-center my-2">
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium leading-[1.35]',
          missed ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground',
        )}
      >
        <CallIcon payload={payload} missed={missed} />
        {label}
      </span>
    </div>
  );
}

export function tryRenderCallSystemMessage(
  systemPayload: unknown,
  currentUserId: string,
): ReactNode | null {
  if (!isConnectionCallSystemPayload(systemPayload)) return null;
  return <CallSystemMessage payload={systemPayload} currentUserId={currentUserId} />;
}
