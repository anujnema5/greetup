'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MessagesPage } from '@/features/chat/pages/messages-page';
import type { MessagesUrlKind } from '@/features/chat/lib/messages-routes';

export function MessagesThreadRoute({ kind }: { kind: MessagesUrlKind }) {
  const router = useRouter();
  const params = useParams();
  const conversationId =
    typeof params.conversationId === 'string' ? params.conversationId : '';

  useEffect(() => {
    if (!conversationId) {
      router.replace('/messages');
    }
  }, [conversationId, router]);

  if (!conversationId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Redirecting…
      </div>
    );
  }

  return <MessagesPage urlKind={kind} urlConversationId={conversationId} />;
}
