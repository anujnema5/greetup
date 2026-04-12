import { chatApi } from '../api/chat-api';
import type { AppDispatch } from '@/lib/redux/store';

export type InboxActivityPatch = {
  lastActivityAt?: string;
  lastMessagePreview?: string | null;
};

export function applyConversationActivityToInbox(
  dispatch: AppDispatch,
  conversationId: string,
  patch: InboxActivityPatch,
): boolean {
  let hit = false;
  dispatch(
    chatApi.util.updateQueryData('listConversations', undefined, (draft) => {
      const i = draft.findIndex((c) => c.id === conversationId);
      if (i === -1) return;
      hit = true;
      if (patch.lastActivityAt) {
        draft[i].updatedAt = patch.lastActivityAt;
        draft.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
      }
      if ('lastMessagePreview' in patch) {
        draft[i].lastMessagePreview = patch.lastMessagePreview ?? null;
      }
    }),
  );
  return hit;
}
