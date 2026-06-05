'use client';

import { Loader2, PhoneOff } from 'lucide-react';

import { Button } from '@/components/ui/button';

import type { OutgoingConnectionCall } from '../types/connection-call.types';
import {
  CallPeerRow,
  ConnectionCallDialogActions,
  ConnectionCallDialogHeader,
  ConnectionCallDialogShell,
  callModeLabel,
} from './connection-call-dialog-shell';

type OutgoingConnectionCallDialogProps = {
  call: OutgoingConnectionCall;
  cancelling: boolean;
  onCancel: () => void;
};

export function OutgoingConnectionCallDialog({
  call,
  cancelling,
  onCancel,
}: OutgoingConnectionCallDialogProps) {
  return (
    <ConnectionCallDialogShell
      open
      allowDismiss
      onOpenChange={(next) => {
        if (!next && !cancelling) onCancel();
      }}
    >
      <ConnectionCallDialogHeader
        mode={call.mode}
        title={callModeLabel(call.mode)}
        description="Waiting for them to answer…"
      />

      <CallPeerRow displayName={call.peerDisplayName} image={call.peerImage} />

      <ConnectionCallDialogActions>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={cancelling}
          onClick={onCancel}
        >
          {cancelling ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
              Cancelling…
            </span>
          ) : (
            <>
              <PhoneOff className="mr-1.5 size-4 shrink-0" aria-hidden />
              Cancel call
            </>
          )}
        </Button>
      </ConnectionCallDialogActions>
    </ConnectionCallDialogShell>
  );
}
