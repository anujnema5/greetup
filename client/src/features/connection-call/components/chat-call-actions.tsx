'use client';

import { Phone, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPeerDisplayFromConversation } from '@/features/chat/lib/conversation-peers';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/features/chat/types/chat.types';
import { useConnectionCallActions } from '../hooks/use-connection-call-actions';
import { useConversationCallEligibility } from '../hooks/use-conversation-call-eligibility';

type ChatCallActionsProps = {
  conversation: Conversation;
  currentUserId: string;
  className?: string;
};

/** Audio / video buttons in the DM thread header. */
export function ChatCallActions({ conversation, currentUserId, className }: ChatCallActionsProps) {
  const { startCall, isStarting } = useConnectionCallActions();
  const { canCall, disabledReason, peerUserId, callable, statusLoading } =
    useConversationCallEligibility(conversation, currentUserId);

  if (!callable || !peerUserId) return null;

  const { label, image } = getPeerDisplayFromConversation(conversation, currentUserId);
  const titleBase = disabledReason ?? `Call ${label}`;

  const handleCall = (mode: 'audio' | 'video') => {
    if (!canCall || isStarting) return;
    void startCall(conversation.id, peerUserId, mode, { displayName: label, image });
  };

  return (
    <div className={cn('flex shrink-0 items-center gap-1', className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary"
        disabled={!canCall || isStarting || statusLoading}
        onClick={() => handleCall('audio')}
        aria-label={`Audio call ${label}`}
        title={canCall ? `Audio call ${label}` : titleBase}
      >
        <Phone className="size-[18px]" strokeWidth={2} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary"
        disabled={!canCall || isStarting || statusLoading}
        onClick={() => handleCall('video')}
        aria-label={`Video call ${label}`}
        title={canCall ? `Video call ${label}` : titleBase}
      >
        <Video className="size-[18px]" strokeWidth={2} />
      </Button>
    </div>
  );
}
