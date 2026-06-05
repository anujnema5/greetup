'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MoreVertical, ShieldBan, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  BlockUserDialog,
  UnblockUserDialog,
  useUnblockUserMutation,
} from '@/features/blocks';
import { useBlockUserAction } from '@/features/blocks/hooks/use-block-user-action';
import { getRtkMutationErrorMessage } from '@/lib/api/rtk-mutation-error';
import { cn } from '@/lib/utils';

import { useDeleteConversationMutation } from '../../api/chat-api';
import { conversationDisplayTitle } from '../../lib/conversation-display';
import {
  getDmPeerBlockUserPeer,
  getDmPeerProfileHref,
} from '../../lib/conversation-peers';
import { isMessagingBlocked } from '../../lib/messaging-block';
import type { Conversation } from '../../types/chat.types';
import { DeleteChatDialog } from './delete-chat-dialog';

const EMPTY_PEER = {
  userId: '',
  username: '',
  displayTitle: '',
  primaryImage: null,
} as const;

type ChatThreadOverflowMenuProps = {
  conversation: Conversation;
  currentUserId: string;
  className?: string;
};

export function ChatThreadOverflowMenu({
  conversation,
  currentUserId,
  className,
}: ChatThreadOverflowMenuProps) {
  const router = useRouter();
  const isCircle = conversation.type === 'room_circle';
  const isDm = !isCircle;
  const peer = isDm ? getDmPeerBlockUserPeer(conversation, currentUserId) : null;
  const profileHref = isDm ? getDmPeerProfileHref(conversation, currentUserId) : null;
  const displayTitle = conversationDisplayTitle(conversation, currentUserId);

  const messagingBlock = conversation.messagingBlock;
  const blocked = isMessagingBlocked(messagingBlock);
  const youBlocked = blocked && messagingBlock.reason === 'you_blocked';
  const showBlockActions = isDm && Boolean(peer);

  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [unblockDialogOpen, setUnblockDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { block, isBlocking } = useBlockUserAction(peer ?? EMPTY_PEER, {
    redirectTo: null,
    conversationId: conversation.id,
  });
  const [unblockUser, { isLoading: isUnblocking }] = useUnblockUserMutation();
  const [deleteConversation, { isLoading: isDeleting }] = useDeleteConversationMutation();

  const handleBlockConfirm = () => {
    if (!peer) return;
    void block().then((ok) => {
      if (ok) setBlockDialogOpen(false);
    });
  };

  const handleUnblockConfirm = () => {
    if (!peer) return;
    void unblockUser({
      targetUserId: peer.userId,
      peerUsername: peer.username,
      conversationId: conversation.id,
    })
      .unwrap()
      .then(() => {
        toast.success(`${peer.displayTitle} unblocked`);
        setUnblockDialogOpen(false);
      })
      .catch((error: unknown) => {
        toast.error(getRtkMutationErrorMessage(error, 'Could not unblock user'));
      });
  };

  const handleDeleteConfirm = () => {
    void deleteConversation(conversation.id)
      .unwrap()
      .then(() => {
        toast.success(isCircle ? 'Chat left' : 'Chat deleted');
        setDeleteDialogOpen(false);
        router.push('/messages');
      })
      .catch((error: unknown) => {
        toast.error(getRtkMutationErrorMessage(error, 'Could not remove chat'));
      });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              'size-9 shrink-0 rounded-xl text-muted-foreground hover:bg-muted/80 hover:text-foreground',
              className,
            )}
            aria-label="More options"
          >
            <MoreVertical className="size-[18px]" strokeWidth={2} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 rounded-xl">
          {profileHref ? (
            <DropdownMenuItem onClick={() => router.push(profileHref)}>
              <UserRound className="size-4" aria-hidden />
              View profile
            </DropdownMenuItem>
          ) : null}

          {showBlockActions && youBlocked ? (
            <DropdownMenuItem onClick={() => setUnblockDialogOpen(true)}>
              <ShieldCheck className="size-4" aria-hidden />
              Unblock user
            </DropdownMenuItem>
          ) : null}

          {showBlockActions && !blocked ? (
            <DropdownMenuItem variant="destructive" onClick={() => setBlockDialogOpen(true)}>
              <ShieldBan className="size-4" aria-hidden />
              Block user
            </DropdownMenuItem>
          ) : null}

          {profileHref || showBlockActions ? <DropdownMenuSeparator /> : null}

          <DropdownMenuItem variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="size-4" aria-hidden />
            {isCircle ? 'Leave chat' : 'Delete chat'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {peer ? (
        <>
          <BlockUserDialog
            open={blockDialogOpen}
            onOpenChange={setBlockDialogOpen}
            onConfirm={handleBlockConfirm}
            isSubmitting={isBlocking}
            peer={{
              name: peer.displayTitle,
              image: peer.primaryImage,
              username: peer.username || null,
            }}
          />

          <UnblockUserDialog
            open={unblockDialogOpen}
            onOpenChange={setUnblockDialogOpen}
            onConfirm={handleUnblockConfirm}
            isSubmitting={isUnblocking}
            peer={{
              name: peer.displayTitle,
              image: peer.primaryImage,
              username: peer.username || null,
            }}
          />
        </>
      ) : null}

      <DeleteChatDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        isSubmitting={isDeleting}
        title={displayTitle}
        isCircle={isCircle}
      />
    </>
  );
}
