'use client';

import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { stashCircleRoomBootstrap } from '@/features/matching/lib/circle-room-bootstrap';
import { circleRoomPath } from '@/features/room/lib/navigation/circle-routes';
import { setRoomReturnPath } from '@/features/room/lib/session/room-return-path';
import { getApiErrorMessage } from '@/lib/api/fetch-client';
import {
  useCancelConnectionCall,
  useInitiateConnectionCall,
  useMarkConnectionCallMissed,
  useRespondConnectionCall,
} from '../api/connection-call.mutations';
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
  const { mutateAsync: initiate, isPending: isStarting } = useInitiateConnectionCall();
  const { mutateAsync: respond, isPending: isResponding } = useRespondConnectionCall();
  const { mutateAsync: cancel, isPending: isCancelling } = useCancelConnectionCall();
  const { mutateAsync: markMissed } = useMarkConnectionCallMissed();

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
        const result = await initiate({ conversationId, mode });
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
        toast.error(getApiErrorMessage(e, 'Could not start call'));
        return null;
      }
    },
    [initiate, joinCallRoom],
  );

  const acceptCall = useCallback(
    async (requestId: string, roomId: string, callerUserId: string, mode: ConnectionCallMode) => {
      try {
        const result = await respond({ requestId, accept: true });
        if (result.accepted) joinCallRoom(roomId, callerUserId, mode);
        return result;
      } catch (e: unknown) {
        toast.error(getApiErrorMessage(e, 'Could not accept call'));
        return null;
      }
    },
    [respond, joinCallRoom],
  );

  const declineCall = useCallback(
    async (requestId: string) => {
      try {
        await respond({ requestId, accept: false });
        return true;
      } catch (e: unknown) {
        toast.error(getApiErrorMessage(e, 'Could not decline call'));
        return false;
      }
    },
    [respond],
  );

  const cancelCall = useCallback(
    async (requestId: string, reason: 'cancelled' | 'no_answer' = 'cancelled') => {
      try {
        await cancel({ requestId, reason });
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
        await markMissed({ requestId });
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
    isStarting,
    isResponding,
    isCancelling,
  };
}
