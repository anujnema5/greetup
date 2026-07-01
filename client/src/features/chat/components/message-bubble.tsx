'use client';

import { useState } from 'react';
import { MoreVertical } from 'lucide-react';
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
import {
  MAX_MESSAGE_CONTENT_LENGTH,
  MESSAGE_BUBBLE_PAD_CLASS,
  MESSAGE_BUBBLE_TEXT_CLASS,
  MESSAGE_AVATAR_CLASS,
  MESSAGE_ROW_GAP,
  MESSAGE_STATUS_ICONS,
} from '../constants';
import { useMessageEdit } from '../hooks/use-message-edit';
import { formatSystemPayload } from '../lib/format-system-payload';
import { tryRenderCallSystemMessage } from './call-system-message';
import {
  bubbleCornerRadius,
  formatMessageTime,
  formatReplyPreview,
  senderLabel,
  type ClusterPosition,
} from '../lib/message-display';
import { MessageSenderAvatar } from './message-sender-avatar';
import type { Message } from '../types/chat.types';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  currentUserId: string;
  replyToMessage?: Message | null;
  clusterPosition?: ClusterPosition;
  showPeerHeader?: boolean;
  peerColumnGutter?: boolean;
  showDirectPeerAvatar?: boolean;
  senderIsOnline?: boolean;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onReply?: (message: Message) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string, forAll: boolean) => void;
  onRetryFailed?: (message: Message) => void;
  editingMessageId?: string | null;
  onEditingChange?: (messageId: string | null) => void;
  revealedTimeMessageId?: string | null;
  onRevealTime?: (messageId: string) => void;
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
  senderIsOnline,
  onReply,
  onEditMessage,
  onDeleteMessage,
  onRetryFailed,
  editingMessageId = null,
  onEditingChange,
  revealedTimeMessageId = null,
  onRevealTime,
}: MessageBubbleProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteForAll, setDeleteForAll] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const {
    editing,
    draft,
    setDraft,
    editRef,
    saveEdit,
    cancelEdit,
    startEdit,
    actionsLocked,
  } = useMessageEdit({
    message,
    editingMessageId,
    onEditMessage,
    onEditingChange,
  });

  if (message.messageType === 'system') {
    const callRow = tryRenderCallSystemMessage(message.systemPayload, currentUserId);
    if (callRow) return callRow;

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

  /** Cap bubble width; use 100% of row in narrow sidebars so bubbles never clip past the edge. */
  const bubbleColumnMax = 'max-w-[min(100%,18.75rem)]';
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

  const handleStartEdit = () => {
    setMenuOpen(false);
    startEdit();
  };

  const replyPreview = message.replyToId
    ? formatReplyPreview(replyToMessage, currentUserId)
    : null;

  const bubble = (
    <div
      className={cn('w-fit min-w-0 max-w-full', bubbleColumnMax, editing && 'mb-1')}
      data-message-row
    >
      <div className="relative w-fit max-w-full min-w-0">
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
            !editing && MESSAGE_BUBBLE_PAD_CLASS,
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
                  MESSAGE_BUBBLE_TEXT_CLASS,
                  isOwn
                    ? 'text-primary-foreground caret-primary-foreground'
                    : 'text-foreground caret-foreground',
                )}
                autoFocus
              />
            ) : (
              <div className={cn('whitespace-pre-wrap', MESSAGE_BUBBLE_TEXT_CLASS)}>{content}</div>
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
                  <DropdownMenuItem className="cursor-pointer rounded-lg px-3 py-2 text-[13px]" onClick={handleStartEdit}>
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
            <span className="shrink-0 whitespace-nowrap">{MESSAGE_STATUS_ICONS[message.status] ?? ''}</span>
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
      <div className="group flex w-full min-w-0 max-w-full justify-end overflow-hidden">
        <div className={cn('min-w-0 max-w-full shrink-0', bubbleColumnMax)}>{bubble}</div>
      </div>
    );
  }

  const leftCol = showPeerHeader ? (
    <MessageSenderAvatar message={message} isOnline={senderIsOnline} />
  ) : peerColumnGutter ? (
    <div className={cn(MESSAGE_AVATAR_CLASS, 'shrink-0')} aria-hidden />
  ) : showDirectPeerAvatar ? (
    <MessageSenderAvatar message={message} isOnline={senderIsOnline} />
  ) : null;

  return (
    <div
      className={cn(
        'group flex w-full min-w-0 max-w-full justify-start overflow-hidden',
        MESSAGE_ROW_GAP,
        leftCol ? (showPeerHeader ? 'items-start' : 'items-end') : 'items-start',
      )}
    >
      {leftCol}
      <div className="min-w-0 max-w-full flex flex-col items-start">
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
