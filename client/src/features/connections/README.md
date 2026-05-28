# Connections feature

## Folder map

| Folder | Purpose |
|--------|---------|
| `api/` | RTK Query — list, request, accept, reject, withdraw, disconnect |
| `state/` | Redux slice for live per-peer connection state (in-call hover) |
| `lib/realtime/` | Socket + notification sync into cache and Redux |
| `hooks/` | `usePeerConnectionSync` — read live state for a peer |
| `components/` | Pages UI, dialogs, `ConnectionRealtimeBridge` |
| `types/` | API types |

## Realtime sync

When connection state changes on the server, peers receive:

- `connection:updated` (socket) — handled by `ConnectionRealtimeBridge` in root layout
- `notification:new` for accept/request — handled by `NotificationsRealtimeBridge`

Both call `applyPeerConnectionSync()` which updates:

1. `connectionRealtimeSync` Redux slice (in-call hover reads this)
2. `getMatchPeerPreview` RTK cache (when already loaded)

Import from `@/features/connections/lib/realtime`.

## Server counterpart

`server/src/modules/connections/socket/emit-connection-updated.ts` emits events on accept, disconnect, withdraw, and reject.
