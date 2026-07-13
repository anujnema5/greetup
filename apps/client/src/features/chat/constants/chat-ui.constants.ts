/** Matches `server/src/modules/chat/schemas/chat.schemas.ts` (`content.max(4000)`). */
export const MAX_MESSAGE_CONTENT_LENGTH = 4000;

/** Shared horizontal padding for message list, composer, and typing row. */
export const CHAT_HORIZONTAL_PADDING = 'px-3 sm:px-4 md:px-5';

/** Composer min height (px); keep in sync with send button (`size-11`). */
export const MESSAGE_INPUT_MIN_HEIGHT_PX = 44;

/** Composer max height (px); matches Tailwind `max-h-32` before inner scroll. */
export const MESSAGE_INPUT_MAX_HEIGHT_PX = 128;

/** Message avatar size; keep in sync with shadcn `MessageAvatar` slot. */
export const MESSAGE_AVATAR_CLASS = 'size-9 shrink-0';

export const MESSAGE_STATUS_ICONS: Record<string, string> = {
  sending: '⏳',
  delivered: '✓',
  read: '✓✓',
  failed: '✗',
};
