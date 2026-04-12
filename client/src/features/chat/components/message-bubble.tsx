'use client';

import { useEffect, useMemo, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { nameInitials } from '@/lib/utils/name-initials';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MAX_MESSAGE_CONTENT_LENGTH } from '../constants';
import { formatSystemPayload } from '../lib/format-system-payload';
import type { Message, Reaction } from '../types/chat.types';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  currentUserId: string;
  /** Avatar + name row (first message in a run from this peer in a circle). */
  showPeerHeader?: boolean;
  /** Spacer under avatar when continuing a run from this peer. */
  peerColumnGutter?: boolean;
  /** Avatar on the left for direct / connection threads (non-group). */
  showDirectPeerAvatar?: boolean;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onReply?: (message: Message) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string, forAll: boolean) => void;
  onRetryFailed?: (message: Message) => void;
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

function groupReactions(reactions: Reaction[] | undefined, userId: string) {
  if (!reactions?.length) return [];
  const map = new Map<string, { emoji: string; count: number; iReacted: boolean }>();
  for (const r of reactions) {
    const cur = map.get(r.emoji) ?? { emoji: r.emoji, count: 0, iReacted: false };
    cur.count += 1;
    if (r.userId === userId) cur.iReacted = true;
    map.set(r.emoji, cur);
  }
  return [...map.values()].sort((a, b) => a.emoji.localeCompare(b.emoji));
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
  currentUserId,
  showPeerHeader = false,
  peerColumnGutter = false,
  showDirectPeerAvatar = false,
  onToggleReaction,
  onReply,
  onEditMessage,
  onDeleteMessage,
  onRetryFailed,
}: MessageBubbleProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteForAll, setDeleteForAll] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(message.content);
  }, [message.content, message.editedAt, editing]);

  const reactionGroups = useMemo(
    () => groupReactions(message.reactions, currentUserId),
    [message.reactions, currentUserId],
  );

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

  const bubbleColumnMax = 'max-w-[min(24rem,100%)]';

  const canEditOrDelete =
    isOwn && !message.isDeleted && onEditMessage && onDeleteMessage && message.messageType === 'text';

  const saveEdit = () => {
    const next = draft.trim();
    if (!next || next.length > MAX_MESSAGE_CONTENT_LENGTH) return;
    onEditMessage?.(message.id, next);
    setEditing(false);
  };

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
        {editing ? (
          <div className="space-y-2 min-w-[12rem]">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, MAX_MESSAGE_CONTENT_LENGTH))}
              className="w-full min-h-[4rem] rounded-lg bg-background/15 text-sm text-foreground p-2 outline-none ring-1 ring-primary-foreground/30"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={saveEdit} disabled={!draft.trim()}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="whitespace-pre-wrap">{content}</div>
        )}
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

      {isOwn && message.status === 'failed' && onRetryFailed && (
        <div className="mt-1 flex justify-end">
          <button
            type="button"
            className="text-xs text-destructive underline-offset-2 hover:underline cursor-pointer"
            onClick={() => onRetryFailed(message)}
          >
            Retry send
          </button>
        </div>
      )}

      {!message.isDeleted && !editing && (
        <div
          className={cn(
            'absolute top-1/2 z-10 -translate-y-1/2 hidden group-hover:flex items-center gap-1',
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
          {onToggleReaction && (
            <span className="flex gap-0.5">
              {(['👍', '❤️', '😂'] as const).map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="text-xs bg-muted rounded-full px-1.5 py-0.5 hover:bg-muted/80 cursor-pointer"
                  title={`React ${emoji}`}
                  onClick={() => onToggleReaction(message.id, emoji)}
                >
                  {emoji}
                </button>
              ))}
            </span>
          )}
          {canEditOrDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="text-xs bg-muted rounded-full p-1 hover:bg-muted/80 cursor-pointer"
                  title="More"
                >
                  <MoreVertical className="size-3.5" strokeWidth={2} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isOwn ? 'end' : 'start'}>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    setDraft(message.content);
                    setEditing(true);
                  }}
                >
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    setDeleteForAll(false);
                    setDeleteOpen(true);
                  }}
                >
                  Remove for you
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={() => {
                    setDeleteForAll(true);
                    setDeleteOpen(true);
                  }}
                >
                  Delete for everyone
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {reactionGroups.length > 0 && onToggleReaction && (
        <div className="mt-1 flex flex-wrap gap-1">
          {reactionGroups.map((g) => (
            <button
              key={g.emoji}
              type="button"
              onClick={() => onToggleReaction(message.id, g.emoji)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] cursor-pointer transition-colors',
                g.iReacted
                  ? 'border-primary bg-primary/15'
                  : 'border-border bg-background/80 hover:bg-muted',
              )}
            >
              <span>{g.emoji}</span>
              <span className="tabular-nums text-muted-foreground">{g.count}</span>
            </button>
          ))}
        </div>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>{deleteForAll ? 'Delete for everyone?' : 'Remove this message?'}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deleteForAll
              ? 'This removes the message for all participants in the chat.'
              : 'The message will be hidden from your view only.'}
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={deleteForAll ? 'destructive' : 'default'}
              onClick={() => {
                onDeleteMessage?.(message.id, deleteForAll);
                setDeleteOpen(false);
              }}
            >
              {deleteForAll ? 'Delete for everyone' : 'Remove for me'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
