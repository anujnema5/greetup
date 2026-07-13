import type { Message, Reaction } from '../types/chat.types';

export type ClusterPosition = 'single' | 'first' | 'middle' | 'last';

export function senderLabel(message: Message): string {
  const s = message.sender;
  if (s) return s.displayName?.trim() || s.name || 'Someone';
  return 'Someone';
}

export function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatReplyPreview(
  replyTo: Message | null | undefined,
  currentUserId: string,
): { senderName: string; preview: string } {
  if (!replyTo) {
    return { senderName: 'Message', preview: 'Original message unavailable' };
  }

  const senderName =
    replyTo.senderId === currentUserId
      ? 'You'
      : replyTo.sender?.displayName?.trim() || replyTo.sender?.name || 'Someone';

  if (replyTo.isDeleted) {
    return {
      senderName,
      preview: replyTo.deletedForAll ? 'This message was deleted' : 'Message removed',
    };
  }

  if (replyTo.messageType !== 'text') {
    return { senderName, preview: `${replyTo.messageType} message` };
  }

  const normalized = replyTo.content.trim().replace(/\s+/g, ' ');
  const preview =
    normalized.length > 100 ? `${normalized.slice(0, 100)}…` : normalized || 'Empty message';

  return { senderName, preview };
}

export interface GroupedReaction {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

export function groupReactions(
  reactions: Reaction[] | undefined,
  currentUserId: string,
): GroupedReaction[] {
  if (!reactions || reactions.length === 0) return [];

  const order: string[] = [];
  const byEmoji = new Map<string, GroupedReaction>();

  for (const r of reactions) {
    const existing = byEmoji.get(r.emoji);
    if (existing) {
      existing.count += 1;
      if (r.userId === currentUserId) existing.reactedByMe = true;
    } else {
      byEmoji.set(r.emoji, { emoji: r.emoji, count: 1, reactedByMe: r.userId === currentUserId });
      order.push(r.emoji);
    }
  }

  return order.map((emoji) => byEmoji.get(emoji)!);
}

export function replyComposerPreview(replyTo: Message, currentUserId: string): {
  senderName: string;
  preview: string;
} {
  const senderName =
    replyTo.senderId === currentUserId
      ? 'You'
      : replyTo.sender?.displayName?.trim() || replyTo.sender?.name || 'Someone';

  const preview = replyTo.isDeleted
    ? 'Message unavailable'
    : replyTo.content.trim().slice(0, 100) || 'Empty message';

  return { senderName, preview };
}
