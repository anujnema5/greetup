# Connections feature

## Folder map

| Folder | Purpose |
|--------|---------|
| `api/` | React Query — list, request, accept, reject, withdraw, disconnect |
| `state/` | Zustand store for live per-peer connection state (in-call hover) |
| `lib/realtime/` | Socket + notification sync into React Query cache and Zustand |
| `hooks/` | `usePeerConnectionSync` — read live state for a peer |
| `components/` | Pages UI, dialogs, `ConnectionRealtimeBridge` |
| `types/` | API types |

## Realtime sync

When connection state changes on the server, peers receive:

- `connection:updated` (socket) — handled by `ConnectionRealtimeBridge` in root layout
- `notification:new` for accept/request — handled by `NotificationsRealtimeBridge`

Both call `applyPeerConnectionSync()` which updates:

1. `connectionRealtimeSync` Zustand store (in-call hover reads this)
2. `matchPeerPreview` React Query cache (when already loaded)

Import from `@/features/connections/lib/realtime`.

## Server counterpart

`server/src/modules/connections/socket/emit-connection-updated.ts` emits events on accept, disconnect, withdraw, and reject.
