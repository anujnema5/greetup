'use client';

import { nameInitials } from '@/lib/utils/name-initials';
import { cn } from '@/lib/utils';
import { formatSystemPayload } from '../lib/format-system-payload';
import type { Message } from '../types/chat.types';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  /** Avatar + name row (first message in a run from this peer in a circle). */
  showPeerHeader?: boolean;
  /** Spacer under avatar when continuing a run from this peer. */
  peerColumnGutter?: boolean;
  /** Avatar on the left for direct / connection threads (non-group). */
  showDirectPeerAvatar?: boolean;
  onReact?: (messageId: string, emoji: string) => void;
  onReply?: (message: Message) => void;
}

const STATUS_ICONS: Record<string, string> = {
  sending:   '⏳',
  delivered: '✓',
  read:      '✓✓',
  failed:    '✗',
};

const AVATAR_CLASS = 'size-9 shrink-0';
const ROW_GAP = 'gap-2.5';

function senderLabel(message: Message): string {
  const s = message.sender;
  if (s) return s.displayName?.trim() || s.name || 'Someone';
  return 'Someone';
}

function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, {
    hour:   'numeric',
    minute: '2-digit',
  });
}

function SenderAvatar({ message }: { message: Message }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center overflow-hidden rounded-full',
        AVATAR_CLASS,
        'bg-linear-to-br from-primary/50 to-primary text-xs font-semibold text-primary-foreground',
      )}
    >
      {message.sender?.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={message.sender.image} alt="" className="size-full object-cover" />
      ) : (
        nameInitials(senderLabel(message))
      )}
    </div>
  );
}

export function MessageBubble({
  message,
  isOwn,
  showPeerHeader = false,
  peerColumnGutter = false,
  showDirectPeerAvatar = false,
  onReact,
  onReply,
}: MessageBubbleProps) {
  if (message.messageType === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className="text-[11px] leading-snug text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
          {formatSystemPayload(message.systemPayload)}
        </span>
      </div>
    );
  }

  const content = message.isDeleted
    ? message.deletedForAll
      ? 'This message was deleted'
      : 'You deleted this message'
    : message.content;

  /** Caps width against the full message row so % / flex min-content does not collapse to one character. */
  const bubbleColumnMax = 'max-w-[min(24rem,100%)]';

  const bubble = (
    <div className={cn('relative min-w-0', bubbleColumnMax)}>
      {message.replyToId && (
        <div className="mb-2 max-w-full truncate border-l-2 border-primary pl-2.5 text-xs leading-snug text-muted-foreground">
          Replying to a message
        </div>
      )}

      <div
        className={cn(
          'block w-fit max-w-full rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed wrap-break-word shadow-sm',
          isOwn
            ? 'bg-primary text-primary-foreground rounded-tr-md'
            : 'bg-muted text-foreground rounded-tl-md',
          message.isDeleted && 'italic opacity-60',
        )}
      >
        <div className="whitespace-pre-wrap">{content}</div>
        <div
          className={cn(
            'mt-2 flex items-center gap-1.5 text-[11px] leading-tight tabular-nums',
            isOwn ? 'justify-end text-primary-foreground/80' : 'justify-start text-muted-foreground',
          )}
        >
          {message.editedAt && !message.isDeleted && (
            <span className="shrink-0 opacity-90">(edited)</span>
          )}
          <span className="whitespace-nowrap">{formatMessageTime(message.createdAt)}</span>
          {isOwn && message.status && (
            <span className="shrink-0 whitespace-nowrap">{STATUS_ICONS[message.status] ?? ''}</span>
          )}
        </div>
      </div>

      {!message.isDeleted && (
        <div
          className={cn(
            'absolute top-1/2 z-10 -translate-y-1/2 hidden group-hover:flex gap-1',
            isOwn ? 'right-full mr-1' : 'left-full ml-1',
          )}
        >
          {onReply && (
            <button
              type="button"
              className="text-xs bg-muted rounded-full p-1 hover:bg-muted/80 cursor-pointer"
              onClick={() => onReply(message)}
              title="Reply"
            >
              ↩
            </button>
          )}
          {onReact && (
            <button
              type="button"
              className="text-xs bg-muted rounded-full p-1 hover:bg-muted/80 cursor-pointer"
              onClick={() => onReact(message.id, '👍')}
              title="React"
            >
              😊
            </button>
          )}
        </div>
      )}
    </div>
  );

  if (isOwn) {
    return (
      <div className="group flex w-full min-w-0 justify-end">
        {bubble}
      </div>
    );
  }

  const leftCol = showPeerHeader ? (
    <SenderAvatar message={message} />
  ) : peerColumnGutter ? (
    <div className={cn(AVATAR_CLASS, 'shrink-0')} aria-hidden />
  ) : showDirectPeerAvatar ? (
    <SenderAvatar message={message} />
  ) : null;

  return (
    <div
      className={cn(
        'group flex w-full min-w-0 justify-start',
        ROW_GAP,
        leftCol ? (showPeerHeader ? 'items-start' : 'items-end') : 'items-start',
      )}
    >
      {leftCol}
      <div className="min-w-0 flex-1">
        {showPeerHeader && (
          <div className="mb-1 text-xs font-medium leading-none text-muted-foreground">
            {senderLabel(message)}
          </div>
        )}
        {bubble}
      </div>
    </div>
  );
}
