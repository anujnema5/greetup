'use client';

import { IncomingConnectionCallDialog } from './incoming-connection-call-dialog';
import { OutgoingConnectionCallDialog } from './outgoing-connection-call-dialog';
import { useConnectionCallBridge } from '../hooks/use-connection-call-bridge';

/** Mount once in root layout — listens for rings app-wide. */
export function ConnectionCallBridge() {
  const {
    incoming,
    outgoing,
    responding,
    cancelling,
    handleAccept,
    handleDecline,
    handleCancelOutgoing,
  } = useConnectionCallBridge();

  return (
    <>
      {incoming ? (
        <IncomingConnectionCallDialog
          call={incoming}
          responding={responding}
          onAccept={() => void handleAccept()}
          onDecline={() => void handleDecline()}
        />
      ) : null}
      {outgoing ? (
        <OutgoingConnectionCallDialog
          call={outgoing}
          cancelling={cancelling}
          onCancel={() => void handleCancelOutgoing()}
        />
      ) : null}
    </>
  );
}
