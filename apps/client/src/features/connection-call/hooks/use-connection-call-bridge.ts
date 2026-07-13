'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/lib/socket';
import { CONNECTION_CALL_RING_TIMEOUT_MS } from '../constants';
import { useConnectionCallAbort } from './use-connection-call-abort';
import { useConnectionCallActions } from './use-connection-call-actions';
import { useConnectionCallRingtone } from './use-connection-call-ringtone';
import { useOutgoingConnectionCall } from './use-outgoing-connection-call';
import { getOutgoingCall } from '../lib/outgoing-call-store';
import { invalidateCallConversationMessages } from '../lib/invalidate-call-conversation-messages';
import { useConnectionCallStore } from '../state/connection-call.store';
import {
  CONNECTION_CALL_SOCKET_EVENTS,
  parseConnectionCallAcceptedPayload,
  parseConnectionCallDeclinedPayload,
  parseConnectionCallRingPayload,
} from '../types/connection-call-socket.types';
import type { IncomingConnectionCall } from '../types/connection-call.types';

/** React 19 — types may lag; runtime provides this hook. */
const useEffectEvent = React.useEffectEvent as <T extends (...args: never[]) => unknown>(fn: T) => T;

/**
 * Global socket listener + ring timeouts for connection calls.
 * Used by `ConnectionCallBridge` (mounted once in root layout).
 */
export function useConnectionCallBridge() {
  const qc = useQueryClient();
  const { socket } = useSocket();
  const outgoing = useOutgoingConnectionCall();
  const { acceptCall, declineCall, cancelCall, markCallMissed, onCallConnected, isCancelling } =
    useConnectionCallActions();
  const { abortOutgoingWait } = useConnectionCallAbort();

  const [incoming, setIncoming] = useState<IncomingConnectionCall | null>(null);
  const [responding, setResponding] = useState(false);
  const [aborting, setAborting] = useState(false);

  useConnectionCallRingtone(Boolean(incoming) || Boolean(outgoing));

  const markMissed = useEffectEvent((conversationId: string | undefined) => {
    if (!conversationId) return;
    useConnectionCallStore.getState().markMissed(conversationId);
  });

  const abortIfOutgoing = useEffectEvent(async (requestId: string, message: string) => {
    const current = getOutgoingCall();
    if (!current || current.requestId !== requestId || aborting) return;
    setAborting(true);
    toast.message(message);
    await abortOutgoingWait(current);
    setAborting(false);
  });

  const onRing = useEffectEvent((payload: unknown) => {
    const parsed = parseConnectionCallRingPayload(payload);
    if (parsed) setIncoming(parsed);
  });

  const onDeclined = useEffectEvent((payload: unknown) => {
    const parsed = parseConnectionCallDeclinedPayload(payload);
    if (!parsed) return;

    const outgoingCall = getOutgoingCall();
    const conversationIdForInvalidate =
      outgoingCall?.requestId === parsed.requestId
        ? outgoingCall.conversationId
        : undefined;

    setIncoming((cur) => {
      if (cur?.requestId === parsed.requestId) {
        if (parsed.reason === 'missed') markMissed(cur.conversationId);
        if (parsed.reason === 'missed' || parsed.reason === 'declined' || parsed.reason === 'cancelled') {
          invalidateCallConversationMessages(qc, cur.conversationId);
        }
        return null;
      }
      return cur;
    });

    if (outgoingCall?.requestId === parsed.requestId) {
      if (parsed.reason === 'missed') markMissed(outgoingCall.conversationId);
      if (parsed.reason === 'missed' || parsed.reason === 'declined' || parsed.reason === 'cancelled') {
        invalidateCallConversationMessages(qc, outgoingCall.conversationId);
      }
      if (parsed.reason === 'declined') void abortIfOutgoing(parsed.requestId, 'Call declined');
      else if (parsed.reason === 'missed') void abortIfOutgoing(parsed.requestId, 'No answer');
      else if (parsed.reason === 'cancelled') void abortIfOutgoing(parsed.requestId, 'Call cancelled');
      return;
    }

    if (conversationIdForInvalidate) {
      invalidateCallConversationMessages(qc, conversationIdForInvalidate);
    }

    if (parsed.reason === 'declined') toast.message('Call declined');
    else if (parsed.reason === 'missed') toast.message('Missed call');
    else if (parsed.reason === 'cancelled') toast.message('Call cancelled');
  });

  const onAccepted = useEffectEvent((payload: unknown) => {
    const parsed = parseConnectionCallAcceptedPayload(payload);
    if (!parsed) return;
    setIncoming(null);
    if (getOutgoingCall()?.requestId === parsed.requestId) {
      onCallConnected(parsed.requestId);
      toast.success('Call connected');
    }
  });

  useEffect(() => {
    socket.on(CONNECTION_CALL_SOCKET_EVENTS.ring, onRing);
    socket.on(CONNECTION_CALL_SOCKET_EVENTS.declined, onDeclined);
    socket.on(CONNECTION_CALL_SOCKET_EVENTS.cancelled, onDeclined);
    socket.on(CONNECTION_CALL_SOCKET_EVENTS.missed, onDeclined);
    socket.on(CONNECTION_CALL_SOCKET_EVENTS.accepted, onAccepted);
    return () => {
      socket.off(CONNECTION_CALL_SOCKET_EVENTS.ring, onRing);
      socket.off(CONNECTION_CALL_SOCKET_EVENTS.declined, onDeclined);
      socket.off(CONNECTION_CALL_SOCKET_EVENTS.cancelled, onDeclined);
      socket.off(CONNECTION_CALL_SOCKET_EVENTS.missed, onDeclined);
      socket.off(CONNECTION_CALL_SOCKET_EVENTS.accepted, onAccepted);
    };
  }, [socket]);

  useEffect(() => {
    if (!incoming) return;
    const remaining = Math.max(0, CONNECTION_CALL_RING_TIMEOUT_MS - (Date.now() - incoming.createdAt));
    const t = window.setTimeout(() => {
      void (async () => {
        const convId = incoming.conversationId;
        await markCallMissed(incoming.requestId);
        invalidateCallConversationMessages(qc, convId);
        setIncoming((cur) => {
          if (cur) {
            markMissed(cur.conversationId);
            toast.message('Missed call');
          }
          return null;
        });
      })();
    }, remaining);
    return () => window.clearTimeout(t);
  }, [incoming, markCallMissed]);

  const onOutgoingTimeout = useEffectEvent(async (requestId: string, conversationId: string) => {
    markMissed(conversationId);
    const recorded = await markCallMissed(requestId);
    if (!recorded) await cancelCall(requestId, 'no_answer');
    invalidateCallConversationMessages(qc, conversationId);
    await abortIfOutgoing(requestId, 'No answer');
  });

  useEffect(() => {
    if (!outgoing) return;
    const remaining = Math.max(0, CONNECTION_CALL_RING_TIMEOUT_MS - (Date.now() - outgoing.startedAt));
    const t = window.setTimeout(() => {
      void onOutgoingTimeout(outgoing.requestId, outgoing.conversationId);
    }, remaining);
    return () => window.clearTimeout(t);
  }, [outgoing]);

  const handleAccept = async () => {
    if (!incoming) return;
    setResponding(true);
    await acceptCall(incoming.requestId, incoming.roomId, incoming.callerUserId, incoming.mode);
    setIncoming(null);
    setResponding(false);
  };

  const handleDecline = async () => {
    if (!incoming) return;
    setResponding(true);
    const convId = incoming.conversationId;
    await declineCall(incoming.requestId);
    invalidateCallConversationMessages(qc, convId);
    setIncoming(null);
    setResponding(false);
  };

  const handleCancelOutgoing = async () => {
    if (!outgoing || aborting) return;
    setAborting(true);
    const convId = outgoing.conversationId;
    await cancelCall(outgoing.requestId);
    invalidateCallConversationMessages(qc, convId);
    await abortOutgoingWait(outgoing);
    setAborting(false);
  };

  return {
    incoming,
    outgoing,
    responding,
    cancelling: isCancelling || aborting,
    handleAccept,
    handleDecline,
    handleCancelOutgoing,
  };
}
