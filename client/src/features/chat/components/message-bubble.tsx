'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Image from 'next/image';
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

type ClusterPosition = 'single' | 'first' | 'middle' | 'last';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  currentUserId: string;
  /** Resolved message being replied to (from the loaded thread). */
  replyToMessage?: Message | null;
  /** Position within a consecutive run from the same sender (Instagram-style grouping). */
  clusterPosition?: ClusterPosition;
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
  /** When set, hover actions are hidden on all other messages. */
  editingMessageId?: string | null;
  onEditingChange?: (messageId: string | null) => void;
  /** Mobile: tapped message — shows time + reply / edit actions. */
  revealedTimeMessageId?: string | null;
  onRevealTime?: (messageId: string) => void;
}

const STATUS_ICONS: Record<string, string> = {
  sending:   '⏳',
  delivered: '✓',
  read:      '✓✓',
  failed:    '✗',
};

const AVATAR_CLASS = 'size-9 shrink-0';
const ROW_GAP = 'gap-2.5';
const BUBBLE_TEXT = 'text-[14px] font-normal leading-[1.35]';
const BUBBLE_PAD = 'px-3 py-2';

function formatReplyPreview(
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

function bubbleCornerRadius(isOwn: boolean, position: ClusterPosition): string {
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
        'relative flex items-center justify-center overflow-hidden rounded-full',
        AVATAR_CLASS,
        'bg-linear-to-br from-primary/50 to-primary text-xs font-semibold text-primary-foreground',
      )}
    >
      {message.sender?.image ? (
        <Image src={message.sender.image} alt="" fill sizes="36px" className="size-full object-cover" unoptimized />
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
  replyToMessage = null,
  clusterPosition = 'single',
  showPeerHeader = false,
  peerColumnGutter = false,
  showDirectPeerAvatar = false,
  onToggleReaction,
  onReply,
  onEditMessage,
  onDeleteMessage,
  onRetryFailed,
  editingMessageId = null,
  onEditingChange,
  revealedTimeMessageId = null,
  onRevealTime,
}: MessageBubbleProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteForAll, setDeleteForAll] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const editRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) setDraft(message.content);
  }, [message.content, editing]);

  useLayoutEffect(() => {
    if (!editing || !editRef.current) return;
    const el = editRef.current;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [editing, draft]);

  // Reaction chips — disabled for now
  // const reactionGroups = useMemo(
  //   () => groupReactions(message.reactions, currentUserId),
  //   [message.reactions, currentUserId],
  // );

  if (message.messageType === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium leading-[1.35] text-muted-foreground">
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

  const bubbleColumnMax = 'max-w-[min(75%,18.75rem)]';
  const showMetaBelow =
    clusterPosition === 'last' ||
    clusterPosition === 'single' ||
    message.status === 'failed';

  const timeRevealed = revealedTimeMessageId === message.id;
  const showTimeMeta = showMetaBelow || timeRevealed;
  const mobileMessageActive = timeRevealed;

  const handleMobileMessageTap = () => {
    if (editing || message.isDeleted || !onRevealTime) return;
    if (window.matchMedia('(min-width: 768px)').matches) return;
    onRevealTime(message.id);
  };

  const canEditOrDelete =
    isOwn && !message.isDeleted && onEditMessage && onDeleteMessage && message.messageType === 'text';

  const saveEdit = () => {
    const next = draft.trim();
    if (!next || next.length > MAX_MESSAGE_CONTENT_LENGTH) return;
    onEditMessage?.(message.id, next);
    setEditing(false);
    onEditingChange?.(null);
  };

  const cancelEdit = () => {
    setDraft(message.content);
    setEditing(false);
    onEditingChange?.(null);
  };

  const startEdit = () => {
    setMenuOpen(false);
    setDraft(message.content);
    setEditing(true);
    onEditingChange?.(message.id);
  };

  useEffect(() => {
    if (!editing) return;
    const node = editRef.current?.closest('[data-message-row]');
    node?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [editing]);

  const actionsLocked = editingMessageId !== null && editingMessageId !== message.id;

  const replyPreview = message.replyToId
    ? formatReplyPreview(replyToMessage, currentUserId)
    : null;

  const bubble = (
    <div
      className={cn('w-fit min-w-0', bubbleColumnMax, editing && 'mb-1')}
      data-message-row
    >
      <div className="relative w-fit max-w-full">
        <div
          onClick={onRevealTime ? handleMobileMessageTap : undefined}
          className={cn(
            'block w-fit max-w-full wrap-anywhere',
            editing ? 'overflow-hidden rounded-[22px] shadow-md ring-2' : bubbleCornerRadius(isOwn, clusterPosition),
            editing
              ? isOwn
                ? 'bg-primary text-primary-foreground ring-primary-foreground/25'
                : 'bg-muted text-foreground ring-foreground/10'
              : isOwn
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground',
            !editing && BUBBLE_PAD,
            message.isDeleted && 'italic opacity-60',
            onRevealTime && !editing && 'max-md:cursor-pointer max-md:active:opacity-90',
          )}
        >
          <div className={cn(editing && 'px-3 py-2.5')}>
            {replyPreview && !editing && (
              <div
                className={cn(
                  'mb-2.5 max-w-full border-l-2 pl-2.5',
                  isOwn ? 'border-primary-foreground/45' : 'border-primary/70',
                )}
              >
                <p
                  className={cn(
                    'truncate text-[12px] font-semibold leading-tight',
                    isOwn ? 'text-primary-foreground/85' : 'text-foreground/85',
                  )}
                >
                  {replyPreview.senderName}
                </p>
                <p
                  className={cn(
                    'mt-0.5 line-clamp-2 text-[12px] leading-snug',
                    isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground',
                    replyToMessage?.isDeleted && 'italic',
                  )}
                >
                  {replyPreview.preview}
                </p>
              </div>
            )}
            {editing ? (
              <textarea
                ref={editRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, MAX_MESSAGE_CONTENT_LENGTH))}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelEdit();
                  }
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    saveEdit();
                  }
                }}
                rows={1}
                className={cn(
                  'block w-full min-w-[8rem] resize-none bg-transparent outline-none',
                  BUBBLE_TEXT,
                  isOwn
                    ? 'text-primary-foreground caret-primary-foreground'
                    : 'text-foreground caret-foreground',
                )}
                autoFocus
              />
            ) : (
              <div className={cn('whitespace-pre-wrap', BUBBLE_TEXT)}>{content}</div>
            )}
          </div>

          {editing && (
            <div
              className={cn(
                'flex items-center justify-end gap-2 border-t px-3 py-2',
                isOwn
                  ? 'border-primary-foreground/20 bg-primary-foreground/5'
                  : 'border-border/60 bg-background/30',
              )}
            >
              <button
                type="button"
                onClick={cancelEdit}
                className={cn(
                  'cursor-pointer rounded-full px-3 py-1 text-[13px] font-medium transition-colors',
                  isOwn
                    ? 'text-primary-foreground/75 hover:bg-primary-foreground/10 hover:text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={!draft.trim() || draft.trim() === message.content.trim()}
                className={cn(
                  'cursor-pointer rounded-full px-3 py-1 text-[13px] font-semibold transition-opacity',
                  'disabled:cursor-not-allowed disabled:opacity-40',
                  isOwn
                    ? 'bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25'
                    : 'bg-primary/15 text-primary hover:bg-primary/25',
                )}
              >
                Done
              </button>
            </div>
          )}
        </div>

        {!message.isDeleted && !editing && !actionsLocked && (
          <div
            className={cn(
              'absolute top-1/2 z-10 -translate-y-1/2 items-center gap-1',
              isOwn ? 'right-full mr-1.5' : 'left-full ml-1.5',
              menuOpen || mobileMessageActive ? 'flex' : 'hidden md:group-hover:flex',
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {onReply && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="h-7 w-7 cursor-pointer rounded-full bg-muted/90 p-1 text-xs shadow-sm hover:bg-muted"
                onClick={(e) => {
                  e.stopPropagation();
                  onReply(message);
                }}
                title="Reply"
              >
                ↩
              </Button>
            )}
            {/* Reaction picker — disabled for now
            {onToggleReaction && (
              <span className="flex gap-0.5">
                {(['👍', '❤️', '😂'] as const).map((emoji) => (
                  <Button
                    key={emoji}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto rounded-full bg-muted px-1.5 py-0.5 text-xs hover:bg-muted/80"
                    title={`React ${emoji}`}
                    onClick={() => onToggleReaction(message.id, emoji)}
                  >
                    {emoji}
                  </Button>
                ))}
              </span>
            )}
            */}
            {canEditOrDelete && (
              <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen} modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="h-7 w-7 cursor-pointer rounded-full bg-muted/90 p-1 text-xs shadow-sm hover:bg-muted data-[state=open]:bg-muted"
                    title="More"
                  >
                    <MoreVertical className="size-3.5" strokeWidth={2} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="bottom"
                  align={isOwn ? 'end' : 'start'}
                  sideOffset={6}
                  avoidCollisions
                  collisionPadding={8}
                  className="min-w-[11rem] rounded-xl p-1 shadow-lg"
                >
                  <DropdownMenuItem className="cursor-pointer rounded-lg px-3 py-2 text-[13px]" onClick={startEdit}>
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer rounded-lg px-3 py-2 text-[13px]"
                    onClick={() => {
                      setMenuOpen(false);
                      setDeleteForAll(false);
                      setDeleteOpen(true);
                    }}
                  >
                    Remove for you
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer rounded-lg px-3 py-2 text-[13px] text-destructive focus:text-destructive"
                    onClick={() => {
                      setMenuOpen(false);
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
      </div>

      {showTimeMeta && !editing && (
        <div
          className={cn(
            'mt-1 flex items-center gap-1 px-0.5 text-[10px] leading-none tabular-nums text-muted-foreground transition-opacity duration-150',
            'max-md:opacity-0',
            timeRevealed && 'max-md:opacity-80',
            'md:opacity-0 md:group-hover:opacity-100',
            isOwn ? 'justify-end' : 'justify-start',
          )}
        >
          {message.editedAt && !message.isDeleted && (
            <span className="shrink-0">Edited</span>
          )}
          <span className="whitespace-nowrap">{formatMessageTime(message.createdAt)}</span>
          {isOwn && message.status && (
            <span className="shrink-0 whitespace-nowrap">{STATUS_ICONS[message.status] ?? ''}</span>
          )}
        </div>
      )}

      {isOwn && message.status === 'failed' && onRetryFailed && (
        <div className="mt-1 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto px-0 text-xs text-destructive underline-offset-2 hover:underline"
            onClick={() => onRetryFailed(message)}
          >
            Retry send
          </Button>
        </div>
      )}

      {/* Reaction chips — disabled for now
      {reactionGroups.length > 0 && onToggleReaction && (
        <div className="mt-1 flex flex-wrap gap-1">
          {reactionGroups.map((g) => (
            <Button
              key={g.emoji}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onToggleReaction(message.id, g.emoji)}
              className={cn(
                'inline-flex h-auto items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors',
                g.iReacted
                  ? 'border-primary bg-primary/15'
                  : 'border-border bg-background/80 hover:bg-muted',
              )}
            >
              <span>{g.emoji}</span>
              <span className="tabular-nums text-muted-foreground">{g.count}</span>
            </Button>
          ))}
        </div>
      )}
      */}

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
      <div className="min-w-0 flex flex-1 flex-col items-start">
        {showPeerHeader && (
          <div className="mb-1 text-[13px] font-medium leading-tight text-muted-foreground">
            {senderLabel(message)}
          </div>
        )}
        {bubble}
      </div>
    </div>
  );
}
