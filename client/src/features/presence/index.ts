/**
 * Online presence (green dot on avatars).
 *
 * Uses batch `peersCallStatus` API — prefer `usePeersOnlineStatus` in lists
 * and pass `isOnline` into `UserAvatarWithPresence` to avoid N+1 queries.
 */

export { OnlinePresenceDot } from './components/online-presence-dot';
export { UserAvatarWithPresence } from './components/user-avatar-with-presence';
export { PRESENCE_POLL_INTERVAL_MS } from './constants';
export { peersCallStatusCacheKey } from './lib/peers-call-status-cache-key';
export { usePeersOnlineStatus, useUserOnlineStatus } from './hooks/use-peers-online-status';
