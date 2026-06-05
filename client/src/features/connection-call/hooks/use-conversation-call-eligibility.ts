'use client';

import { useMemo } from 'react';
import { getDmPeerUserId } from '@/features/chat/lib/conversation-peers';
import { PRESENCE_POLL_INTERVAL_MS } from '@/features/presence/constants';
import { connectionsApi } from '@/features/connections/api/connections-api';
import { canCallFromConversation } from '../lib/call-eligibility';
import type { Conversation } from '@/features/chat/types/chat.types';

export function useConversationCallEligibility(
  conversation: Conversation | undefined,
  currentUserId: string,
) {
  const peerUserId = conversation ? getDmPeerUserId(conversation, currentUserId) : null;

  const cacheKey = peerUserId ?? '';
  const { data: statusMap, isFetching } = connectionsApi.usePeersCallStatusQuery(cacheKey, {
    skip: !peerUserId,
    pollingInterval: PRESENCE_POLL_INTERVAL_MS,
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
