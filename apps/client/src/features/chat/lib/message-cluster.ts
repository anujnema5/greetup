import type { ConversationType, Message } from '../types/chat.types';
import type { ClusterPosition } from './message-display';

export interface MessageRowLayout {
  clusterPosition: ClusterPosition;
  spacingClass: string;
  showPeerHeader: boolean;
  peerColumnGutter: boolean;
  showDirectPeerAvatar: boolean;
  replyToMessage: Message | null;
  isOwn: boolean;
}

function isClusterBreak(prev: Message | null, msg: Message): boolean {
  return (
    !prev ||
    prev.messageType === 'system' ||
    msg.messageType === 'system' ||
    prev.senderId !== msg.senderId
  );
}

function isSamePeer(msg: Message, other: Message): boolean {
  return other.messageType !== 'system' && other.senderId === msg.senderId;
}

export function getClusterPosition(
  msg: Message,
  prev: Message | null,
  next: Message | null,
): ClusterPosition {
  if (msg.messageType === 'system') return 'single';

  const clusterBreak = isClusterBreak(prev, msg);
  const nextSamePeer = next ? isSamePeer(msg, next) : false;
  const isReply = !!msg.replyToId;

  if (isReply) return 'single';
  if (clusterBreak && !nextSamePeer) return 'single';
  if (clusterBreak && nextSamePeer) return 'first';
  if (!clusterBreak && nextSamePeer) return 'middle';
  return 'last';
}

export function getMessageSpacingClass(
  index: number,
  msg: Message,
  prev: Message | null,
  editingMessageId: string | null,
): string {
  if (index === 0) return '';

  const prevIsEditing = !!prev && editingMessageId === prev.id;
  const thisIsEditing = editingMessageId === msg.id;
  const isReply = !!msg.replyToId && msg.messageType !== 'system';
  const clusterBreak = isClusterBreak(prev, msg);

  if (thisIsEditing || prevIsEditing || isReply) return 'mt-4';
  if (editingMessageId) return 'mt-3';
  if (clusterBreak) return 'mt-4';
  return 'mt-2';
}

export function getMessageRowLayout(params: {
  msg: Message;
  index: number;
  prev: Message | null;
  next: Message | null;
  messages: Message[];
  currentUserId: string;
  conversationType?: ConversationType;
  editingMessageId: string | null;
}): MessageRowLayout {
  const {
    msg,
    index,
    prev,
    next,
    messages,
    currentUserId,
    conversationType,
    editingMessageId,
  } = params;

  const isOwn = msg.senderId === currentUserId;
  const isReply = !!msg.replyToId && msg.messageType !== 'system';
  const replyToMessage = isReply
    ? messages.find((m) => m.id === msg.replyToId) ?? null
    : null;

  const isGroup = conversationType === 'room_space';
  const clusterPosition = getClusterPosition(msg, prev, next);
  const isPeerText = !isOwn && msg.messageType !== 'system';
  const isDirectPeerText = isPeerText && !isGroup;
  const isClusterStart = clusterPosition === 'single' || clusterPosition === 'first';
  const isClusterTail = clusterPosition === 'middle' || clusterPosition === 'last';

  return {
    clusterPosition,
    spacingClass: getMessageSpacingClass(index, msg, prev, editingMessageId),
    showPeerHeader: isGroup && isPeerText && isClusterStart,
    peerColumnGutter: isPeerText && isClusterTail,
    showDirectPeerAvatar: isDirectPeerText && isClusterStart,
    replyToMessage,
    isOwn,
  };
}
