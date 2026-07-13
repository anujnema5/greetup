import { nameInitials } from '@/lib/utils/name-initials';
import type { Conversation } from '../types/chat.types';

function peerLabel(u: { displayName: string | null; name: string }): string {
  return u.displayName?.trim() || u.name || 'Member';
}

export function conversationDisplayTitle(conv: Conversation, currentUserId: string): string {
  if (conv.type === 'room_space') {
    return conv.room?.title?.trim() || 'Space';
  }

  const others = conv.participants
    .map((p) => p.user)
    .filter((u): u is NonNullable<typeof u> => !!u && u.id !== currentUserId);

  if (others.length === 1) return peerLabel(others[0]!);
  if (others.length > 1) {
    const names = others.slice(0, 2).map(peerLabel);
    const extra = others.length - 2;
    return extra > 0 ? `${names.join(', ')} +${extra}` : names.join(', ');
  }

  if (conv.type === 'connection') return 'Messages';
  if (conv.type === 'room_direct') return 'Direct call';
  return conv.type;
}

function participantPhrase(n: number): string {
  return `${n} participant${n === 1 ? '' : 's'}`;
}

export function conversationMetaSubtitle(conv: Conversation): string {
  const n = conv.participants.length;
  if (conv.type === 'room_space') {
    return participantPhrase(n);
  }
  if (conv.type === 'connection' || conv.type === 'room_direct') {
    return 'Direct Message';
  }
  return participantPhrase(n);
}

export function conversationListSubtitle(conv: Conversation): string {
  const preview = conv.lastMessagePreview?.trim();
  if (preview) return preview;
  return conversationMetaSubtitle(conv);
}

export function conversationListAvatar(
  conv: Conversation,
  currentUserId: string,
): { image: string | null; label: string } {
  if (conv.type === 'room_space') {
    const title = conv.room?.title?.trim() || 'Space';
    return { image: null, label: nameInitials(title) };
  }

  const other = conv.participants.find((p) => p.userId !== currentUserId)?.user;
  if (other) {
    return {
      image: other.image,
      label: nameInitials(peerLabel(other)),
    };
  }

  return { image: null, label: '?' };
}

export function formatConversationUpdatedAt(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (Number.isNaN(d.getTime())) return '';
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
