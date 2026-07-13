'use client';

import { useMemo } from 'react';
import { publicProfileHref } from '@/features/user-profile/lib/public-profile-href';
import type { BlockUserPeer } from '@/features/blocks/types/blocks-api.types';
import type { Conversation } from '../types/chat.types';

/** The other person in a 1:1 DM (`connection` or `room_direct`). */
export function getDmPeerUserId(conversation: Conversation, currentUserId: string): string | null {
  if (conversation.type === 'room_space') return null;
  const others = conversation.participants.filter((p) => p.userId !== currentUserId);
  if (others.length !== 1) return null;
  return others[0]!.userId;
}

export function getDmPeerParticipant(conversation: Conversation, currentUserId: string) {
  const userId = getDmPeerUserId(conversation, currentUserId);
  if (!userId) return null;
  return conversation.participants.find((p) => p.userId === userId) ?? null;
}

export function getDmPeerProfileHref(
  conversation: Conversation,
  currentUserId: string,
): string | null {
  const participant = getDmPeerParticipant(conversation, currentUserId);
  return publicProfileHref(participant?.user?.username);
}

export function getPeerDisplayFromConversation(
  conversation: Conversation,
  currentUserId: string,
): { userId: string | null; label: string; image: string | null } {
  const userId = getDmPeerUserId(conversation, currentUserId);
  const peer = conversation.participants.find((p) => p.userId === userId)?.user;
  const label = peer?.displayName?.trim() || peer?.name?.trim() || 'Contact';
  return { userId, label, image: peer?.image ?? null };
}

/** Block / profile actions for the DM peer in a thread header. */
export function getDmPeerBlockUserPeer(
  conversation: Conversation,
  currentUserId: string,
): BlockUserPeer | null {
  const participant = getDmPeerParticipant(conversation, currentUserId);
  if (!participant?.userId) return null;

  const user = participant.user;
  const displayTitle = user?.displayName?.trim() || user?.name?.trim() || 'User';
  const username = user?.username?.trim() ?? '';

  return {
    userId: participant.userId,
    username,
    displayTitle,
    primaryImage: user?.image ?? null,
  };
}

export function collectDmPeerUserIds(conversations: Conversation[], currentUserId: string): string[] {
  const ids = new Set<string>();
  for (const conv of conversations) {
    const peerId = getDmPeerUserId(conv, currentUserId);
    if (peerId) ids.add(peerId);
  }
  return [...ids];
}

/** Batch-load online status for every DM peer visible in the inbox. */
export function useInboxDmPeerUserIds(conversations: Conversation[], currentUserId: string): string[] {
  return useMemo(
    () => collectDmPeerUserIds(conversations, currentUserId),
    [conversations, currentUserId],
  );
}
