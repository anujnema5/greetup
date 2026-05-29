import type { Message } from '../types/chat.types';

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

export function bubbleCornerRadius(isOwn: boolean, position: ClusterPosition): string {
  if (isOwn) {
    switch (position) {
      case 'first':
        return 'rounded-tl-[22px] rounded-tr-[22px] rounded-bl-[22px] rounded-br-[4px]';
      case 'middle':
        return 'rounded-tl-[22px] rounded-bl-[22px] rounded-tr-[4px] rounded-br-[4px]';
      case 'last':
        return 'rounded-tl-[22px] rounded-bl-[22px] rounded-br-[22px] rounded-tr-[4px]';
      default:
        return 'rounded-[22px]';
    }
  }

  switch (position) {
    case 'first':
      return 'rounded-tl-[22px] rounded-tr-[22px] rounded-br-[22px] rounded-bl-[4px]';
    case 'middle':
      return 'rounded-tr-[22px] rounded-br-[22px] rounded-tl-[4px] rounded-bl-[4px]';
    case 'last':
      return 'rounded-tr-[22px] rounded-br-[22px] rounded-bl-[22px] rounded-tl-[4px]';
    default:
      return 'rounded-[22px]';
  }
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
