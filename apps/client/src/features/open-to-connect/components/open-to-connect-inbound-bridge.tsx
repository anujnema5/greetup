"use client";

import { IncomingConnectRequestDialog } from "./incoming-connect-request-dialog";
import { useInboundConnectRequestBridge } from "../hooks/use-inbound-connect-request-bridge";

/** Mount once in root layout — shows inbound connect requests app-wide. */
export function OpenToConnectInboundBridge() {
  const { incoming, responding, handleAccept, handleDecline } = useInboundConnectRequestBridge();

  if (!incoming) return null;

  return (
    <IncomingConnectRequestDialog
      request={incoming}
      responding={responding}
      onAccept={handleAccept}
      onDecline={handleDecline}
    />
  );
}
