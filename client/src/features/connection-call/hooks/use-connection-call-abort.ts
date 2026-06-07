'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRoomStore } from '@/features/room/state/room.store';
import { useLeaveRoom } from '@/features/room/api/room.mutations';
import { clearRoomStorage } from '@/features/room/lib/session/room-sync';
import { consumeRoomReturnPath } from '@/features/room/lib/session/room-return-path';
import { clearLobbyMediaIntent } from '@/features/room/lib/lobby';
import { messagesDirectConversationPath } from '../lib/call-navigation';
import { clearOutgoingCall } from '../lib/outgoing-call-store';
import type { OutgoingConnectionCall } from '../types/connection-call.types';

/** Leave room + end session when a ring is declined, timed out, or cancelled. */
export function useConnectionCallAbort() {
  const router = useRouter();
  const endVideoSession = useRoomStore((s) => s.endVideoSession);
  const { mutateAsync: leaveRoom } = useLeaveRoom();

  const abortOutgoingWait = useCallback(
    async (call: OutgoingConnectionCall) => {
      clearOutgoingCall();
      clearLobbyMediaIntent();
      endVideoSession();
      const returnPath = consumeRoomReturnPath(
        messagesDirectConversationPath(call.conversationId),
      );
      clearRoomStorage();
      await leaveRoom({ roomId: call.roomId }).catch(() => {});
      router.replace(returnPath);
    },
    [endVideoSession, leaveRoom, router],
  );

  return { abortOutgoingWait };
}
