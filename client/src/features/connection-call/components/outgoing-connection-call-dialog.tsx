'use client';

import { PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { OutgoingConnectionCall } from '../types/connection-call.types';

type OutgoingConnectionCallDialogProps = {
  call: OutgoingConnectionCall;
  cancelling: boolean;
  onCancel: () => void;
};

function PeerAvatar({ call }: { call: OutgoingConnectionCall }) {
  const initials = call.peerDisplayName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div
      className={cn(
        'relative flex size-24 items-center justify-center overflow-hidden rounded-3xl',
        'bg-linear-to-br from-muted to-muted/60 text-2xl font-semibold text-foreground',
        'ring-2 ring-border/60 shadow-lg',
      )}
    >
      {call.peerImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={call.peerImage} alt="" className="size-full object-cover" />
      ) : (
        initials || '?'
      )}
      <span
        className="absolute -inset-1 -z-10 animate-pulse rounded-3xl bg-primary/15"
        aria-hidden
      />
    </div>
  );
}

export function OutgoingConnectionCallDialog({
  call,
  cancelling,
  onCancel,
}: OutgoingConnectionCallDialogProps) {
  const isVideo = call.mode === 'video';

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="outgoing-call-title"
    >
      <div
        className={cn(
          'w-full max-w-sm overflow-hidden rounded-3xl border border-border/60',
          'bg-card/95 shadow-2xl backdrop-blur-xl',
        )}
      >
        <div className="flex flex-col items-center gap-4 px-6 pb-6 pt-10">
          <PeerAvatar call={call} />
          <div className="space-y-1 text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Calling…
            </p>
            <h2 id="outgoing-call-title" className="text-xl font-semibold text-foreground">
              {call.peerDisplayName}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isVideo ? 'Waiting for them to join your video call' : 'Waiting for them to answer'}
            </p>
            <div className="flex items-center justify-center gap-1.5 pt-2">
              <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
            </div>
          </div>
        </div>

        <div className="border-t border-border/50 bg-muted/20 px-6 py-5">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 w-full rounded-2xl border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onCancel}
            disabled={cancelling}
          >
            <PhoneOff className="mr-2 size-4" />
            {cancelling ? 'Cancelling…' : 'Cancel call'}
          </Button>
        </div>
      </div>
    </div>
  );
}
