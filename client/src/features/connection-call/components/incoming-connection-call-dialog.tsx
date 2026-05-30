'use client';

import { Phone, PhoneOff, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { IncomingConnectionCall } from '../types/connection-call.types';

type IncomingConnectionCallDialogProps = {
  call: IncomingConnectionCall;
  responding: boolean;
  onAccept: () => void;
  onDecline: () => void;
};

function CallerAvatar({ call }: { call: IncomingConnectionCall }) {
  const initials = call.callerDisplayName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div
      className={cn(
        'relative flex size-24 items-center justify-center overflow-hidden rounded-3xl',
        'bg-linear-to-br from-primary/80 to-primary text-2xl font-semibold text-primary-foreground',
        'ring-2 ring-primary/30 shadow-lg shadow-primary/20',
      )}
    >
      {call.callerImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={call.callerImage} alt="" className="size-full object-cover" />
      ) : (
        initials || '?'
      )}
      <span className="absolute -inset-1 -z-10 animate-ping rounded-3xl bg-primary/20" aria-hidden />
    </div>
  );
}

export function IncomingConnectionCallDialog({
  call,
  responding,
  onAccept,
  onDecline,
}: IncomingConnectionCallDialogProps) {
  const isVideo = call.mode === 'video';

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="incoming-call-title"
    >
      <div
        className={cn(
          'w-full max-w-sm overflow-hidden rounded-3xl border border-border/60',
          'bg-card/95 shadow-2xl backdrop-blur-xl',
        )}
      >
        <div className="flex flex-col items-center gap-4 px-6 pb-6 pt-10">
          <CallerAvatar call={call} />
          <div className="space-y-1 text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-primary/90">
              Incoming {isVideo ? 'video' : 'audio'} call
            </p>
            <h2 id="incoming-call-title" className="text-xl font-semibold text-foreground">
              {call.callerDisplayName}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isVideo ? 'Camera and microphone will turn on if you accept' : 'Microphone will turn on if you accept'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-border/50 bg-muted/20 px-6 py-5">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 rounded-2xl border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDecline}
            disabled={responding}
          >
            <PhoneOff className="mr-2 size-4" />
            Decline
          </Button>
          <Button
            type="button"
            size="lg"
            className="h-12 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-600/90"
            onClick={onAccept}
            disabled={responding}
          >
            {isVideo ? <Video className="mr-2 size-4" /> : <Phone className="mr-2 size-4" />}
            {responding ? 'Joining…' : 'Accept'}
          </Button>
        </div>
      </div>
    </div>
  );
}
