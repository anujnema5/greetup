'use client';

import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { stashCircleRoomBootstrap } from '@/features/matching/lib/circle-room-bootstrap';
import { circleRoomPath } from '@/features/room/lib/navigation/circle-routes';
import { setRoomReturnPath } from '@/features/room/lib/session/room-return-path';
import { getRtkMutationErrorMessage } from '@/lib/api/rtk-mutation-error';
import {
  useCancelConnectionCallMutation,
  useInitiateConnectionCallMutation,
  useMarkConnectionCallMissedMutation,
  useRespondConnectionCallMutation,
} from '../api/connection-call-api';
import { applyConnectionCallMediaIntent } from '../lib/call-media-intent';
import {
  clearOutgoingCall,
  markOutgoingCallConnected,
  setOutgoingCall,
} from '../lib/outgoing-call-store';
import type { ConnectionCallMode } from '../types/connection-call.types';

type StartCallPeer = {
  displayName: string;
  image: string | null;
};

export function useConnectionCallActions() {
  const router = useRouter();
  const pathname = usePathname();
  const [initiate, initiateState] = useInitiateConnectionCallMutation();
  const [respond, respondState] = useRespondConnectionCallMutation();
  const [cancel, cancelState] = useCancelConnectionCallMutation();
  const [markMissed] = useMarkConnectionCallMissedMutation();

  const joinCallRoom = useCallback(
    (roomId: string, peerUserId: string, mode: ConnectionCallMode) => {
      setRoomReturnPath(pathname);
      applyConnectionCallMediaIntent(mode);
      stashCircleRoomBootstrap(roomId, { peerId: peerUserId, score: null });
      router.push(circleRoomPath(roomId));
    },
    [pathname, router],
  );

  const startCall = useCallback(
    async (
      conversationId: string,
      peerUserId: string,
      mode: ConnectionCallMode,
      peer: StartCallPeer,
    ) => {
      try {
        const result = await initiate({ conversationId, mode }).unwrap();
        setOutgoingCall({
          ...result,
          startedAt: Date.now(),
          peerDisplayName: peer.displayName,
          peerImage: peer.image,
          status: 'ringing',
        });
        joinCallRoom(result.roomId, peerUserId, mode);
        return result;
      } catch (e: unknown) {
        toast.error(getRtkMutationErrorMessage(e, 'Could not start call'));
        return null;
      }
    },
    [initiate, joinCallRoom],
  );

  const acceptCall = useCallback(
    async (requestId: string, roomId: string, callerUserId: string, mode: ConnectionCallMode) => {
      try {
        const result = await respond({ requestId, accept: true }).unwrap();
        if (result.accepted) joinCallRoom(roomId, callerUserId, mode);
        return result;
      } catch (e: unknown) {
        toast.error(getRtkMutationErrorMessage(e, 'Could not accept call'));
        return null;
      }
    },
    [respond, joinCallRoom],
  );

  const declineCall = useCallback(
    async (requestId: string) => {
      try {
        await respond({ requestId, accept: false }).unwrap();
        return true;
      } catch (e: unknown) {
        toast.error(getRtkMutationErrorMessage(e, 'Could not decline call'));
        return false;
      }
    },
    [respond],
  );

  const cancelCall = useCallback(
    async (requestId: string, reason: 'cancelled' | 'no_answer' = 'cancelled') => {
      try {
        await cancel({ requestId, reason }).unwrap();
        return true;
      } catch {
        return false;
      }
    },
    [cancel],
  );

  const markCallMissed = useCallback(
    async (requestId: string) => {
      try {
        await markMissed({ requestId }).unwrap();
        return true;
      } catch {
        return false;
      }
    },
    [markMissed],
  );

  const onCallConnected = useCallback((requestId: string) => {
    markOutgoingCallConnected(requestId);
    window.setTimeout(() => clearOutgoingCall(), 400);
  }, []);

  return {
    startCall,
    acceptCall,
    declineCall,
    cancelCall,
    markCallMissed,
    onCallConnected,
    isStarting: initiateState.isLoading,
    isResponding: respondState.isLoading,
    isCancelling: cancelState.isLoading,
  };
}
