'use client';

import { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Bubble, BubbleContent, BubbleReactions } from '@/components/ui/bubble';
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from '@/components/ui/message';
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
  MESSAGE_AVATAR_CLASS,
  MESSAGE_STATUS_ICONS,
} from '../constants';
import { useMessageEdit } from '../hooks/use-message-edit';
import { formatSystemPayload } from '../lib/format-system-payload';
import { tryRenderCallSystemMessage } from './call-system-message';
import {
  formatMessageTime,
  formatReplyPreview,
  groupReactions,
  senderLabel,
  type ClusterPosition,
} from '../lib/message-display';
import { MessageSenderAvatar } from './message-sender-avatar';
import type { Message as ChatMessage } from '../types/chat.types';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  currentUserId: string;
  replyToMessage?: ChatMessage | null;
  clusterPosition?: ClusterPosition;
  showPeerHeader?: boolean;
  peerColumnGutter?: boolean;
  showDirectPeerAvatar?: boolean;
  senderIsOnline?: boolean;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onReply?: (message: ChatMessage) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string, forAll: boolean) => void;
  onRetryFailed?: (message: ChatMessage) => void;
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

  const reactions = groupReactions(message.reactions, currentUserId);

  /** Avatar column width (size-9) + Message's gap-2; indents the footer/retry row under the bubble. */
  const peerIndentClass = 'ml-11';

  const leftAvatar = showPeerHeader ? (
    <MessageAvatar className="self-start">
      <MessageSenderAvatar message={message} isOnline={senderIsOnline} />
    </MessageAvatar>
  ) : showDirectPeerAvatar ? (
    <MessageAvatar>
      <MessageSenderAvatar message={message} isOnline={senderIsOnline} />
    </MessageAvatar>
  ) : peerColumnGutter ? (
    <MessageAvatar aria-hidden className={cn(MESSAGE_AVATAR_CLASS, 'invisible')} />
  ) : null;

  return (
    <div className="group flex w-full min-w-0 max-w-full flex-col">
      <Message
        align={isOwn ? 'end' : 'start'}
        className={cn(
          !isOwn && (leftAvatar ? (showPeerHeader ? 'items-start' : 'items-end') : 'items-start'),
        )}
      >
        {!isOwn && leftAvatar}
        <MessageContent data-message-row className={cn('gap-1', isOwn && 'items-end')}>
          {showPeerHeader && (
            <MessageHeader className="px-0.5 pb-0 text-[13px] font-medium normal-case text-muted-foreground">
              {senderLabel(message)}
            </MessageHeader>
          )}

          <div className="relative w-fit max-w-full min-w-0">
            <Bubble
              variant={isOwn ? 'default' : 'muted'}
              align={isOwn ? 'end' : 'start'}
              className="max-w-[min(100%,18.75rem)]"
            >
              <BubbleContent
                onClick={onRevealTime ? handleMobileMessageTap : undefined}
                className={cn(
                  'wrap-anywhere',
                  editing && 'overflow-hidden p-0 ring-2',
                  editing && (isOwn ? 'ring-primary-foreground/25' : 'ring-foreground/10'),
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
                        'block w-full min-w-[8rem] resize-none bg-transparent text-sm leading-relaxed outline-none',
                        isOwn
                          ? 'text-primary-foreground caret-primary-foreground'
                          : 'text-foreground caret-foreground',
                      )}
                      autoFocus
                    />
                  ) : (
                    <div className="whitespace-pre-wrap">{content}</div>
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
              </BubbleContent>

              {reactions.length > 0 && !editing && (
                <BubbleReactions side="bottom" align={isOwn ? 'end' : 'start'}>
                  {reactions.map((r) => (
                    <button
                      key={r.emoji}
                      type="button"
                      onClick={() => onToggleReaction?.(message.id, r.emoji)}
                      disabled={!onToggleReaction}
                      className={cn(
                        'flex items-center gap-0.5 rounded-full px-1 leading-none transition-colors',
                        r.reactedByMe && 'text-primary',
                        onToggleReaction && 'cursor-pointer hover:opacity-80',
                      )}
                    >
                      <span>{r.emoji}</span>
                      {r.count > 1 && (
                        <span className="text-[10px] tabular-nums text-muted-foreground">{r.count}</span>
                      )}
                    </button>
                  ))}
                </BubbleReactions>
              )}
            </Bubble>

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
        </MessageContent>
      </Message>

      {showTimeMeta && !editing && (
        <MessageFooter
          className={cn(
            'mt-1 gap-1 px-0.5 tabular-nums transition-opacity duration-150',
            isOwn ? 'justify-end' : 'justify-start',
            !isOwn && peerIndentClass,
            'max-md:opacity-0',
            timeRevealed && 'max-md:opacity-80',
            'md:opacity-0 md:group-hover:opacity-100',
          )}
        >
          {message.editedAt && !message.isDeleted && (
            <span className="shrink-0">Edited</span>
          )}
          <span className="whitespace-nowrap">{formatMessageTime(message.createdAt)}</span>
          {isOwn && message.status && (
            <span className="shrink-0 whitespace-nowrap">{MESSAGE_STATUS_ICONS[message.status] ?? ''}</span>
          )}
        </MessageFooter>
      )}

      {isOwn && message.status === 'failed' && onRetryFailed && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-1 h-auto self-end px-0 text-xs text-destructive underline-offset-2 hover:underline"
          onClick={() => onRetryFailed(message)}
        >
          Retry send
        </Button>
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
          <DialogFooter>
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
}
