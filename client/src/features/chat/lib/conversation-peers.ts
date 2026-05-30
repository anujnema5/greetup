'use client';

import { useMemo } from 'react';
import type { Conversation } from '../types/chat.types';

/** The other person in a 1:1 DM (`connection` or `room_direct`). */
export function getDmPeerUserId(conversation: Conversation, currentUserId: string): string | null {
  if (conversation.type === 'room_circle') return null;
  const others = conversation.participants.filter((p) => p.userId !== currentUserId);
  if (others.length !== 1) return null;
  return others[0]!.userId;
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
