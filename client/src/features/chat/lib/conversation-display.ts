import { nameInitials } from '@/lib/utils/name-initials';
import type { Conversation } from '../types/chat.types';

function peerLabel(u: { displayName: string | null; name: string }): string {
  return u.displayName?.trim() || u.name || 'Member';
}

/** Title for inbox / header: room title, DM peer name(s), or type fallback. */
export function conversationDisplayTitle(conv: Conversation, currentUserId: string): string {
  if (conv.type === 'room_circle') {
    return conv.room?.title?.trim() || 'Circle';
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

export function conversationSubtitle(conv: Conversation): string {
  if (conv.type === 'room_circle') {
    const n = conv.participants.length;
    return `${n} participant${n === 1 ? '' : 's'}`;
  }
  if (conv.type === 'connection' || conv.type === 'room_direct') {
    return 'Direct message';
  }
  const n = conv.participants.length;
  return `${n} participant${n === 1 ? '' : 's'}`;
}

/** Avatar URL + fallback initials label for list row. */
export function conversationListAvatar(
  conv: Conversation,
  currentUserId: string,
): { image: string | null; label: string } {
  if (conv.type === 'room_circle') {
    const title = conv.room?.title?.trim() || 'Circle';
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
