'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MessagesPage } from '@/features/chat/pages/messages-page';
import { isMessagesUrlKind } from '@/features/chat/lib/messages-routes';

export default function MessagesThreadPage() {
  const router = useRouter();
  const params = useParams();
  const kindRaw = typeof params.kind === 'string' ? params.kind : '';
  const conversationId = typeof params.conversationId === 'string' ? params.conversationId : '';

  useEffect(() => {
    if (!kindRaw || !conversationId || !isMessagesUrlKind(kindRaw)) {
      router.replace('/messages');
    }
  }, [kindRaw, conversationId, router]);

  if (!kindRaw || !conversationId || !isMessagesUrlKind(kindRaw)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Redirecting…
      </div>
    );
  }

  return <MessagesPage urlKind={kindRaw} urlConversationId={conversationId} />;
}
