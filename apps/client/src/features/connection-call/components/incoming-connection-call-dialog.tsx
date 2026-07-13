'use client';

import { Phone, PhoneOff, Video } from 'lucide-react';

import { Button } from '@/components/ui/button';

import type { IncomingConnectionCall } from '../types/connection-call.types';
import {
  CallPeerRow,
  ConnectionCallDialogActions,
  ConnectionCallDialogHeader,
  ConnectionCallDialogShell,
  callModeHint,
  callModeLabel,
} from './connection-call-dialog-shell';

type IncomingConnectionCallDialogProps = {
  call: IncomingConnectionCall;
  responding: boolean;
  onAccept: () => void;
  onDecline: () => void;
};

export function IncomingConnectionCallDialog({
  call,
  responding,
  onAccept,
  onDecline,
}: IncomingConnectionCallDialogProps) {
  const isVideo = call.mode === 'video';

  return (
    <ConnectionCallDialogShell
      open
      onOpenChange={(next) => {
        if (!next && !responding) onDecline();
      }}
    >
      <ConnectionCallDialogHeader
        mode={call.mode}
        title={callModeLabel(call.mode)}
        description={callModeHint(call.mode)}
      />

      <CallPeerRow
        displayName={call.callerDisplayName}
        image={call.callerImage}
        seed={call.callerUserId}
      />

      <ConnectionCallDialogActions>
        <Button
          type="button"
          variant="outline"
          className="flex-3"
          disabled={responding}
          onClick={onDecline}
        >
          <PhoneOff className="mr-1.5 size-4 shrink-0" aria-hidden />
          Decline
        </Button>
        <Button type="button" className="flex-2" disabled={responding} onClick={onAccept}>
          {isVideo ? (
            <Video className="mr-1.5 size-4 shrink-0" aria-hidden />
          ) : (
            <Phone className="mr-1.5 size-4 shrink-0" aria-hidden />
          )}
          {responding ? 'Joining…' : 'Accept'}
        </Button>
      </ConnectionCallDialogActions>
    </ConnectionCallDialogShell>
  );
}
