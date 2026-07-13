'use client';

import { useMemo } from 'react';
import { getDmPeerUserId } from '@/features/chat/lib/conversation-peers';
import { usePeersCallStatus } from '@/features/connections/api/connections.queries';
import { PRESENCE_POLL_INTERVAL_MS } from '@/features/presence/constants';
import { canCallFromConversation } from '../lib/call-eligibility';
import type { Conversation } from '@/features/chat/types/chat.types';

export function useConversationCallEligibility(
  conversation: Conversation | undefined,
  currentUserId: string,
) {
  const peerUserId = conversation ? getDmPeerUserId(conversation, currentUserId) : null;

  const peerIds = useMemo(() => (peerUserId ? [peerUserId] : []), [peerUserId]);
  const { data: statusMap, isFetching } = usePeersCallStatus(peerIds, {
    enabled: Boolean(peerUserId),
    refetchInterval: PRESENCE_POLL_INTERVAL_MS,
  });

  const peerStatus = peerUserId ? statusMap?.[peerUserId] : undefined;

  return useMemo(() => {
    const callable = Boolean(conversation && canCallFromConversation(conversation) && peerUserId);
    const isOnline = peerStatus?.isOnline ?? false;
    const isBusy = peerStatus?.inLiveRoom ?? false;
    const canCall = callable && isOnline && !isBusy;
    let disabledReason: string | null = null;
    if (!callable) disabledReason = 'Calls are only available in direct messages';
    else if (!isOnline) disabledReason = 'Offline';
    else if (isBusy) disabledReason = 'In a call';

    return {
      peerUserId,
      callable,
      isOnline,
      isBusy,
      canCall,
      disabledReason,
      statusLoading: isFetching && !peerStatus,
    };
  }, [conversation, peerUserId, peerStatus, isFetching]);
}
