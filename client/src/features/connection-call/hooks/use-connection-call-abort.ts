'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch } from '@/lib/redux/hooks';
import { endVideoSession } from '@/lib/redux/slices/room-slice';
import { useLeaveRoomMutation } from '@/features/room/api/room-api';
import { clearRoomStorage } from '@/features/room/lib/session/room-sync';
import { clearLobbyMediaIntent } from '@/features/room/lib/lobby';
import { messagesDirectConversationPath } from '../lib/call-navigation';
import { clearOutgoingCall } from '../lib/outgoing-call-store';
import type { OutgoingConnectionCall } from '../types/connection-call.types';

/** Leave room + end session when a ring is declined, timed out, or cancelled. */
export function useConnectionCallAbort() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [leaveRoom] = useLeaveRoomMutation();

  const abortOutgoingWait = useCallback(
    async (call: OutgoingConnectionCall) => {
      clearOutgoingCall();
      clearLobbyMediaIntent();
      dispatch(endVideoSession());
      clearRoomStorage();
      await leaveRoom({ roomId: call.roomId }).unwrap().catch(() => {});
      router.replace(messagesDirectConversationPath(call.conversationId));
    },
    [dispatch, leaveRoom, router],
  );

  return { abortOutgoingWait };
}
