# Client state migration: RTK Query + Redux → React Query + Zustand

Living document for migrating the Circlo client off `@reduxjs/toolkit` / `react-redux` onto `@tanstack/react-query` (server state) and `zustand` (client state).

**Status:** Migration complete — React Query + Zustand only; Redux and RTK Query removed (2026-06-05)  
**Last updated:** 2026-06-05

---

## Table of contents

1. [Goals](#goals)
2. [Current architecture](#current-architecture)
3. [Target architecture](#target-architecture)
4. [Migration principles](#migration-principles)
5. [Phase 0 — Foundation](#phase-0--foundation)
6. [Phase 1 — RTK Query → React Query](#phase-1--rtk-query--react-query)
7. [Phase 2 — Redux slices → Zustand](#phase-2--redux-slices--zustand)
8. [Phase 3 — Remove Redux](#phase-3--remove-redux)
9. [Pattern reference](#pattern-reference)
10. [Realtime / socket bridges](#realtime--socket-bridges)
11. [PR plan & progress tracker](#pr-plan--progress-tracker)
12. [Gotchas](#gotchas)

---

## Goals

- **React Query** owns all server/async data: fetch, cache, pagination, invalidation, optimistic updates.
- **Zustand** owns ephemeral client/UI state: room session, chat UI, call markers, realtime sync maps.
- **No big-bang rewrite** — both stacks run in parallel until the last reference is gone.
- Keep existing `API_ENDPOINTS`, response types, and envelope helpers (`data` wrapper).

### Non-goals

- Changing API contracts or backend routes.
- Rewriting feature UI unless a hook signature change requires it.
- Adding server-side React Query prefetching (client is overwhelmingly `'use client'` today).

---

## Current architecture (final — post-migration)

React Query + Zustand only. `layout.tsx` wraps the app with `QueryProvider` (no Redux).

| Client state (Zustand) | Path |
|------------------------|------|
| Room session | `features/room/state/room.store.ts` |
| Embedded activities | `features/room/state/room-activity.store.ts` |
| Chat UI | `features/chat/state/chat-ui.store.ts` |
| Connection call badges | `features/connection-call/state/connection-call.store.ts` |
| Live connection sync | `features/connections/state/connection-realtime-sync.store.ts` |

Server data lives in per-feature `api/*.queries.ts` / `*.mutations.ts` with keys in `lib/query/keys.ts`.

---

## Pre-migration architecture (reference)

### Redux store (`client/src/lib/redux/store.ts`) — removed

| Slice / reducer | Path | Purpose |
|-----------------|------|---------|
| `api` (RTK Query) | `lib/api/base-api.ts` | Shared server cache |
| ~~`room`~~ | `features/room/state/room.store.ts` (Zustand) | Room session, peers, media, minimized UI |
| ~~`roomActivity`~~ | `features/room/state/room-activity.store.ts` (Zustand) | Embedded activities (chess), tied to room lifecycle |
| ~~`chat`~~ | `features/chat/state/chat-ui.store.ts` (Zustand) | Typing, unread counts, active conversation |
| ~~`connectionCall`~~ | `features/connection-call/state/connection-call.store.ts` (Zustand) | Missed-call badges per conversation |
| ~~`connectionRealtimeSync`~~ | `features/connections/state/connection-realtime-sync.store.ts` (Zustand) | Live per-peer connection state (in-call hover) |

### RTK Query API slices (19 files)

All inject into `baseApi` via `injectEndpoints`:

| Feature | API file | Exported hooks (summary) |
|---------|----------|--------------------------|
| Blocks | `features/blocks/api/blocks-api.ts` | list, block, unblock |
| Chat | `features/chat/api/chat-api.ts` | conversations, messages (cursor merge), 7 mutations |
| Circles | `features/circles/api/circles-api.ts` | categories, list, **infinite browse**, CRUD |
| Connection call | `features/connection-call/api/connection-call-api.ts` | initiate, respond, cancel, mark missed |
| Connections | `features/connections/api/connections-api.ts` | list, **infinite accepted**, peers call status, 5 mutations |
| Explore — browse | `features/explore/api/browse-niches-api.ts` | niches, lazy niche rooms |
| Explore — search | `features/explore/api/user-search-api.ts` | search, lazy search |
| Explore — suggested | `features/explore/api/suggested-people-api.ts` | suggested people |
| Matching | `features/matching/api/matching-api.ts` | find/cancel/respond match, peer preview |
| Notifications | `features/notifications/api/notifications-api.ts` | list, unread count, mark read |
| Presence | `features/presence/api/presence-api.ts` | online people count |
| Profile insights | `features/profile/api/profile-insights-api.ts` | profile insights |
| Profile setup | `features/profile-setup/components/profile-setup-api.ts` | onboarding, profile, match prep, geocode (largest API) |
| Public profile | `features/user-profile/api/public-profile-api.ts` | public profile |
| Room | `features/room/api/room-api.ts` | get/join/leave room, circle ops, invites (13 hooks) |
| RTC | `features/rtc/api/rtc-api.ts` | RTC token |
| Settings | `features/settings/api/account-settings-api.ts` | update phone |
| Tour guide | `features/tour-guide/api/tour-guide-api.ts` | welcome tour status |
| Activity (chess) | `features/activity/api/activity-api.ts` | 6 chess mutations |

### RTK cache tag types (`base-api.ts`)

`AccountSession`, `ProfileSetupSteps`, `ProfileMe`, `Connections`, `CircleCategories`, `ActiveCircles`, `RtcToken`, `Room`, `RoomEmbeddedActivities`, `PublicProfile`, `Notifications`, `MatchPrepPrompt`, `MatchPeerPreview`, `Conversations`, `Messages`, `Blocks`, `Presence`, `ExploreSuggestedPeople`, `ExploreBrowseNiches`, `ExploreBrowseNicheRooms`, `WelcomeTour`

### Files using Redux selectors/dispatch (~25)

```
features/activity/chess/components/chess-socket-bridge.tsx
features/chat/pages/messages-page.tsx
features/connection-call/hooks/use-connection-call-abort.ts
features/connection-call/hooks/use-connection-call-bridge.ts
features/connections/components/connection-realtime-bridge.tsx
features/connections/hooks/use-peer-connection-sync.ts
features/matching/hooks/use-room.ts
features/notifications/components/notifications-realtime-bridge.tsx
features/room/call/shell/in-call-container.tsx
features/room/components/minimized-dock/minimized-room-dock.tsx
features/room/components/minimized-dock/room-minimized-hydration.tsx
features/room/hooks/call/peer-profile-hover/use-connection-panel.ts
features/room/hooks/call/use-room-activity-toasts.ts
features/room/hooks/session/use-room-ui.ts
features/room/hooks/session/use-room-video.ts
features/room/listeners/on-circle-opened-for-join.tsx
features/room/listeners/on-circle-title-updated.tsx
features/room/listeners/on-direct-expanded-to-circle.tsx
features/room/listeners/on-host-ended-circle.tsx
features/room/listeners/on-participant-removed-from-circle.tsx
features/room/listeners/on-partner-disconnected.tsx
features/room/pages/room-page.tsx
features/room/pages/search/circle-search-page.tsx
features/rtc/providers/rtc-socket-provider.tsx
lib/redux/hooks.ts
```

### Files patching RTK cache via `dispatch(api.util…)` (15)

```
features/blocks/api/blocks-api.ts
features/chat/api/chat-api.ts
features/chat/components/chat-inbox-socket-bridge.tsx
features/chat/hooks/use-chat.ts
features/chat/hooks/use-conversation.ts
features/chat/lib/inbox-order.ts
features/chat/lib/message-rtk-sync.ts
features/chat/lib/messaging-block/invalidate-conversations-cache.ts
features/connection-call/lib/invalidate-call-conversation-messages.ts
features/connections/lib/realtime/sync-from-notification.ts
features/connections/lib/realtime/sync-from-socket.ts
features/matching/lib/peer-preview-cache.ts
features/notifications/components/notifications-realtime-bridge.tsx
features/room/listeners/on-circle-opened-for-join.tsx
features/room/listeners/on-circle-title-updated.tsx
features/room/listeners/on-direct-expanded-to-circle.tsx
features/tour-guide/api/tour-guide-api.ts
```

### Provider wiring today

- `client/src/app/layout.tsx` → `<ReduxProvider>` wraps the app.
- Side-effect imports in `store.ts` register `account-settings-api` and `tour-guide-api`.

---

## Target architecture

```
client/src/lib/
  api/
    fetch-client.ts       # shared fetch + ApiError (replaces fetchBaseQuery)
    endpoints.ts          # unchanged
    query-params.ts       # unchanged
  query/
    client.ts             # QueryClient singleton + default options
    keys.ts               # centralized query keys (replaces tag types)
    provider.tsx          # QueryClientProvider

client/src/features/<feature>/
  api/
    <feature>.queries.ts  # useQuery / useInfiniteQuery hooks
    <feature>.mutations.ts  # useMutation hooks (optional split)
  state/
    <feature>.store.ts    # Zustand store (client state only)
```

### Layout providers

```tsx
<QueryProvider>
  {children}
</QueryProvider>
```

---

## Migration principles

1. **One feature per PR** when possible — easier review, easier rollback.
2. **Migrate consumers before deleting** the old API file.
3. **Centralize query keys** in `lib/query/keys.ts` — never scatter string literals.
4. **Centralize invalidation** in mutation hooks (`onSuccess`), not in random components.
5. **Socket bridges** get `useQueryClient()` instead of `useStore()` + `dispatch`.
6. **Zustand stores are small and domain-scoped** — do not recreate a monolithic Redux store.
7. **Update this doc** after each merged PR (check boxes, notes).

---

## Phase 0 — Foundation

- [x] Install dependencies: `bun add @tanstack/react-query zustand`
- [x] Optional dev: `bun add -d @tanstack/react-query-devtools`
- [x] Create `lib/api/fetch-client.ts`
- [x] Create `lib/query/client.ts`
- [x] Create `lib/query/keys.ts` (skeleton — grow per feature)
- [x] Create `lib/query/provider.tsx`
- [x] Wrap `layout.tsx` with `QueryClientProvider` (keep `ReduxProvider` inside)
- [x] Add devtools in development only

### `fetch-client.ts` sketch

```ts
import { API_BASE_URL } from '@/shared/constants/environments';

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`API ${status}`);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  const json = await res.json();
  return (json.data ?? json) as T;
}
```

### `query/client.ts` defaults

```ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

### `query/keys.ts` skeleton

```ts
export const queryKeys = {
  presence: {
    onlineCount: ['presence', 'online-count'] as const,
  },
  blocks: {
    all: ['blocks'] as const,
    list: ['blocks', 'list'] as const,
  },
  connections: {
    all: ['connections'] as const,
    list: (filter: string) => ['connections', 'list', filter] as const,
    acceptedInfinite: (search: string) => ['connections', 'accepted', search] as const,
    pendingCount: ['connections', 'pending-count'] as const,
    peersCallStatus: (userIds: string[]) => ['connections', 'call-status', userIds] as const,
  },
  chat: {
    conversations: ['chat', 'conversations'] as const,
    conversation: (id: string) => ['chat', 'conversation', id] as const,
    messages: (conversationId: string) => ['chat', 'messages', conversationId] as const,
  },
  // add per feature as migrated
} as const;
```

---

## Phase 1 — RTK Query → React Query

Migrate **leaf features first**, **chat + room last**.

### Recommended order

| Order | Feature | Risk | Notes |
|-------|---------|------|-------|
| 1 | Presence | Low | 1 query, no cache sync |
| 2 | Blocks | Low | Isolated |
| 3 | Tour guide | Low | 1 query + 1 mutation |
| 4 | Settings | Low | 1 mutation |
| 5 | Profile insights | Low | 1 query |
| 6 | Public profile | Low | 1 query, cross-invalidated by connections |
| 7 | Presence-adjacent: RTC token | Low | 1 query |
| 8 | Notifications | Medium | Realtime bridge patches cache |
| 9 | Explore (3 APIs) | Medium | Lazy queries |
| 10 | Profile setup | Medium | Many endpoints |
| 11 | Matching | Medium | Peer preview cache sync |
| 12 | Connection call API | Medium | Invalidates chat messages |
| 13 | Circles | Medium | Infinite query |
| 14 | Connections | High | Infinite query + cross-invalidation + realtime |
| 15 | Activity (chess) | Medium | Mutations only |
| 16 | Room API | High | Tied to room Zustand state |
| 17 | Chat API | High | Cursor merge + many socket bridges |

### Per-feature checklist

For each `*-api.ts`:

- [ ] Create `*.queries.ts` / `*.mutations.ts`
- [ ] Add query keys to `lib/query/keys.ts`
- [ ] Port `transformResponse` logic into `queryFn` return
- [ ] Port `invalidatesTags` → `onSuccess` + `queryClient.invalidateQueries`
- [ ] Port `onQueryStarted` optimistic updates → `onMutate` / `onError` rollback
- [ ] Port `updateQueryData` call sites → `queryClient.setQueryData`
- [ ] Update all hook consumers in the feature
- [ ] Update feature `index.ts` exports
- [ ] Delete `*-api.ts` (or leave stub re-exporting new hooks temporarily)
- [ ] Remove side-effect import from `store.ts` if any
- [ ] Update feature README if it mentions RTK

### Feature progress

#### Presence
- [x] API migrated
- [x] Consumers updated
- [x] RTK file removed

#### Blocks
- [x] API migrated
- [x] Consumers updated
- [x] RTK file removed

#### Tour guide
- [x] API migrated
- [x] Consumers updated
- [x] RTK file removed

#### Settings
- [x] API migrated
- [x] Consumers updated
- [x] RTK file removed

#### Profile insights
- [x] API migrated
- [x] Consumers updated
- [x] RTK file removed

#### Public profile
- [x] API migrated
- [x] Consumers updated
- [x] RTK file removed

#### RTC
- [x] API migrated
- [x] Room listeners + `room-api` hybrid RTC invalidation updated
- [x] RTK file removed

#### Notifications
- [x] API migrated
- [x] `notifications-realtime-bridge.tsx` updated
- [x] Consumers updated
- [x] RTK file removed

#### Explore
- [x] `browse-niches-api` migrated
- [x] `user-search-api` migrated
- [x] `suggested-people-api` migrated
- [x] Consumers updated
- [x] RTK files removed

#### Profile setup
- [x] API migrated (15 hooks)
- [x] Consumers updated
- [x] RTK file removed

#### Matching
- [x] API migrated
- [x] `peer-preview-cache.ts` updated
- [x] Consumers updated
- [x] RTK file removed

#### Connection call (API only — slice is Phase 2)
- [x] API migrated
- [x] `invalidate-call-conversation-messages.ts` updated
- [x] Consumers updated
- [x] RTK file removed

#### Circles
- [x] API migrated (infinite query)
- [x] Consumers updated
- [x] RTK file removed

#### Connections
- [x] API migrated (infinite query)
- [x] `sync-from-socket.ts` updated
- [x] `sync-from-notification.ts` updated
- [x] Consumers updated
- [x] RTK file removed

#### Activity (chess)
- [ ] API migrated
- [ ] Consumers updated
- [ ] RTK file removed

#### Room
- [ ] API migrated
- [ ] Room listeners (`on-*`) updated
- [ ] Consumers updated
- [ ] RTK file removed

#### Chat
- [x] API migrated (cursor pagination)
- [x] `message-rtk-sync.ts` → `message-cache-sync.ts`
- [x] `chat-inbox-socket-bridge.tsx` updated
- [x] `invalidate-conversations-cache.ts` updated
- [x] `inbox-order.ts` updated
- [x] `use-chat.ts` / `use-conversation.ts` updated
- [x] Consumers updated
- [x] RTK file removed

#### Cleanup
- [ ] Delete `lib/api/base-api.ts`
- [ ] Delete `lib/api/rtk-query-error.ts` (or repurpose for `ApiError`)
- [ ] Remove `baseApi` from `store.ts`

---

## Phase 2 — Redux slices → Zustand

Migrate **small slices first**, **room last**.

### Recommended order

| Order | Slice | New store path | Risk |
|-------|-------|----------------|------|
| 1 | `connectionCall` | `features/connection-call/state/connection-call.store.ts` | Low |
| 2 | `connectionRealtimeSync` | `features/connections/state/connection-realtime-sync.store.ts` | Low |
| 3 | `chat` | `features/chat/state/chat-ui.store.ts` | Medium |
| 4 | `roomActivity` | `features/room/state/room-activity.store.ts` | Medium — lifecycle coupling |
| 5 | `room` | `features/room/state/room.store.ts` | High — ~25 consumers |

### Per-slice checklist

- [ ] Create Zustand store with equivalent state shape
- [ ] Port reducers → store actions
- [ ] Port selectors → standalone functions or inline selectors
- [ ] Replace `useAppSelector` / `useAppDispatch` in all consumers
- [ ] Handle `extraReducers` coupling (room ↔ roomActivity) with explicit calls
- [ ] Delete Redux slice file
- [ ] Remove reducer from `store.ts`

### Slice progress

#### `connectionCall`
- [x] Store created
- [x] Consumers updated (`use-connection-call-bridge`, `messages-page`, `conversation-list`)
- [x] Slice deleted

#### `connectionRealtimeSync`
- [x] Store created
- [x] `apply-peer-connection-sync.ts` updated
- [x] `connection-realtime-bridge` + `sync-from-socket` use React Query invalidation
- [x] `use-peer-connection-sync.ts` updated
- [x] Slice deleted

#### `chat`
- [x] Store created
- [x] `chat-messages-cache-bridge.tsx` reads active conversation from Zustand
- [x] `messages-page.tsx`, `conversation-list.tsx`, unread hooks updated
- [x] Slice deleted

#### `roomActivity`
- [x] Store created
- [x] Lifecycle resets wired from room store actions (replaces `extraReducers`)
- [x] `chess-socket-bridge.tsx`, `in-call-container.tsx` updated
- [x] Slice deleted

#### `room`
- [x] Store created (ui, session, media, peers, chat.draft)
- [x] All ~25 consumers updated
- [x] Selectors exported from `room.store.ts` / `room-activity.store.ts`
- [x] Slice deleted

#### Cleanup
- [x] Delete `lib/redux/` directory
- [x] Delete `lib/redux/provider.tsx`
- [x] Remove `<ReduxProvider>` from `layout.tsx`

---

## Phase 3 — Remove Redux

Final gate — all boxes above must be checked:

- [x] No `injectEndpoints` / `baseApi` references
- [x] No `useAppSelector` / `useAppDispatch` / `useSelector` / `useDispatch`
- [x] No `dispatch(*.util.updateQueryData)` / `invalidateTags`
- [x] `lib/redux/` deleted
- [x] `bun remove @reduxjs/toolkit react-redux`

---

## Pattern reference

### Simple query

```ts
// Before (RTK)
const { data, isLoading } = useGetOnlinePeopleCountQuery();

// After (React Query)
export function useOnlinePeopleCount() {
  return useQuery({
    queryKey: queryKeys.presence.onlineCount,
    queryFn: () => apiFetch<{ count: number }>(PRESENCE.ONLINE_COUNT),
  });
}
```

### Mutation with invalidation

```ts
// RTK: invalidatesTags: [CACHE_CONNECTIONS_LIST, CACHE_PROFILE_INSIGHTS]
export function useAcceptConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (arg: RespondConnectionMutationArg) =>
      apiFetch(CONNECTIONS.accept(arg.connectionId), { method: 'POST' }),
    onSuccess: (_, arg) => {
      qc.invalidateQueries({ queryKey: queryKeys.connections.all });
      qc.invalidateQueries({ queryKey: queryKeys.profile.insights });
      if (arg.peerUsername) {
        qc.invalidateQueries({ queryKey: queryKeys.publicProfile(arg.peerUsername) });
      }
    },
  });
}
```

### Infinite query (connections, circles)

```ts
export function useAcceptedConnections(search: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.connections.acceptedInfinite(search),
    queryFn: ({ pageParam }) =>
      apiFetch<ListConnectionsData>(
        CONNECTIONS.accepted({ page: pageParam, search }),
      ),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  });
}
```

### Cursor-paginated messages (replaces RTK `merge` + `serializeQueryArgs`)

```ts
export function useMessages(conversationId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.chat.messages(conversationId),
    queryFn: ({ pageParam }) =>
      apiFetch<MessagesPage>(messagesUrl(conversationId, pageParam)),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}

// Flatten in consumer:
// const messages = data?.pages.flatMap((p) => p.messages) ?? [];
// Or keep pages reversed if older pages append at the end — match current UX.
```

### Optimistic update (replaces `onQueryStarted`)

```ts
return useMutation({
  mutationFn: deleteConversation,
  onMutate: async (conversationId) => {
    await qc.cancelQueries({ queryKey: queryKeys.chat.conversations });
    const previous = qc.getQueryData<Conversation[]>(queryKeys.chat.conversations);
    qc.setQueryData(queryKeys.chat.conversations, (list) =>
      list?.filter((c) => c.id !== conversationId),
    );
    return { previous };
  },
  onError: (_err, _id, ctx) => {
    if (ctx?.previous) qc.setQueryData(queryKeys.chat.conversations, ctx.previous);
  },
  onSettled: () => {
    qc.invalidateQueries({ queryKey: queryKeys.chat.conversations });
  },
});
```

### Cache patch from socket (replaces `dispatch(api.util.updateQueryData)`)

```ts
// Before
applySocketNewMessage(dispatch, getState, msg, currentUserId);

// After
function applySocketNewMessage(qc: QueryClient, msg: Message, currentUserId: string) {
  qc.setQueryData(
    queryKeys.chat.messages(msg.conversationId),
    (old: InfiniteData<MessagesPage> | undefined) => {
      if (!old) return old;
      // merge into first page, dedupe by id
      return mergeMessageIntoPages(old, msg);
    },
  );
  qc.setQueryData(queryKeys.chat.conversations, (list) =>
    reorderInboxOnNewMessage(list, msg),
  );
}
```

### Redux selector → Zustand

```ts
// Before
const phase = useAppSelector((s) => s.room.session.phase);
dispatch(startVideoSession({ roomId }));

// After
const phase = useRoomStore((s) => s.session.phase);
useRoomStore.getState().startVideoSession({ roomId });

// Derived (keep outside store)
export const selectIsInCall = (s: RoomState) => s.session.phase === 'in_call';
```

### `roomActivity` extraReducers → explicit calls

RTK today resets activity when `enterRoomPage`, `endVideoSession`, or `beginSearchingNextCall` fire. In Zustand, call from room actions:

```ts
// room.store.ts
startVideoSession: (payload) => {
  set((s) => ({ /* room updates */ }));
  useRoomActivityStore.getState().clearOnSessionChange();
},
```

---

## Realtime / socket bridges

These files need `useQueryClient()` and (where applicable) Zustand instead of Redux store reads:

| Bridge / sync file | Reads Redux? | Patches RTK cache? | Phase |
|--------------------|-------------|-------------------|-------|
| `chat-messages-cache-bridge.tsx` | Yes (`activeConversationId`) | Via `message-rtk-sync.ts` | 1 + 2 |
| `chat-inbox-socket-bridge.tsx` | No | Yes | 1 |
| `connection-realtime-bridge.tsx` | Yes (`connectionRealtimeSync`) | Yes | 1 + 2 |
| `notifications-realtime-bridge.tsx` | No | Yes | 1 |
| `connections/lib/realtime/sync-from-socket.ts` | No | Yes | 1 |
| `connections/lib/realtime/sync-from-notification.ts` | No | Yes | 1 |
| Room listeners (`on-circle-*`, `on-direct-*`, etc.) | Some | Yes | 1 + 2 |

---

## PR plan & progress tracker

Use this section to log merged PRs and notes.

| PR | Title | Status | Notes |
|----|-------|--------|-------|
| 1 | Foundation: React Query + Zustand providers, fetch-client, query keys | ✅ Done | Both stacks run in parallel |
| 2 | Migrate presence + blocks | ✅ Done | Hybrid invalidation via `invalidateAfterBlockAction` |
| 3 | Zustand: connectionCall + connectionRealtimeSync | ✅ Done | `connection-call.store.ts`, `connection-realtime-sync.store.ts` |
| 4 | Migrate tour guide, settings, profile insights, public profile, RTC | ✅ Done | Hybrid invalidation for connections + blocks + room RTC |
| 5 | Migrate notifications + explore | ✅ Done | `useFetchBrowseNicheRooms` replaces lazy RTK query |
| 6 | Migrate profile setup + matching | ✅ Done | `useFetchLocationSuggestions`; peer preview via `queryClient.setQueryData` |
| 7 | Migrate connection call API + circles | ✅ Done | Hybrid chat message invalidation; `useBrowseActiveCircles` infinite query |
| 8 | Migrate connections API + realtime sync | ✅ Done | `invalidateAfterConnectionAction` hybrid; socket bridges use `useQueryClient` |
| 9 | Zustand: chat slice | ✅ Done | `chat-ui.store.ts` — typing, unread counts, active conversation |
| 10 | Migrate chat API + socket bridges | ✅ Done | `useMessages` infinite query; `message-cache-sync.ts` for socket patches |
| 11 | Zustand: roomActivity + room | ✅ Done | `room.store.ts`, `room-activity.store.ts`; Redux store is RTK api only |
| 12 | Migrate room API + activity + room listeners | ✅ Done | `room.queries.ts`, `room.mutations.ts`, `activity.mutations.ts`; listeners use RQ cache sync |
| 13 | Remove Redux + RTK Query | ✅ Done | Deleted `lib/redux/`, `base-api.ts`; layout is Query-only |
| 14 | Post-migration cleanup | ✅ Done | Comments/READMEs; `rtkErrorMessage` → `apiErrorMessage` |

**Legend:** ⬜ Not started · 🟡 In progress · ✅ Done

---

## Gotchas

### 1. Chat message pagination

RTK `getMessages` uses custom `merge` + `serializeQueryArgs` so all cursor fetches share one cache entry per `conversationId`. React Query `useInfiniteQuery` does this natively via pages — verify message order (newest first) when flattening.

### 2. Cross-feature invalidation

Connections mutations invalidate: connections lists, profile insights, explore suggested people, public profile, match peer preview. Keep a shared `invalidateAfterConnectionAction(qc, arg)` helper.

### 3. Lazy queries

`useLazySearchUsersQuery`, `useLazyGetBrowseNicheRoomsQuery`, etc. → `useQuery` with `enabled: false` + `refetch()`, or a thin wrapper around `queryClient.fetchQuery`.

### 4. `profile-setup-api.ts` location

Lives under `components/` today. Consider moving to `features/profile-setup/api/` during migration (optional cleanup).

### 5. Next.js / SSR

Current pages are client-heavy. A module-level `queryClient` singleton is fine. Only introduce per-request clients if server components start fetching.

### 6. DevTools

- React Query: `@tanstack/react-query-devtools`
- Zustand: `devtools` middleware if you want Redux DevTools parity

### 7. Testing strategy

After each PR: `bun run typecheck`, manual smoke test of the migrated feature, and grep for leftover old hook names:

```bash
rg "useGet.*Query|useLazy.*Query|useAppSelector|injectEndpoints" client/src
```

### 8. Feature READMEs

Update `connections/README.md` (and others) when realtime sync stops mentioning Redux/RTK.

---

## Quick commands

```bash
# Install (Phase 0)
bun add @tanstack/react-query zustand
bun add -d @tanstack/react-query-devtools

# Find remaining RTK / Redux usage
rg "injectEndpoints|useAppSelector|useAppDispatch|baseApi" client/src
rg "use\w+Query|use\w+Mutation" client/src --glob "*.tsx"

# Typecheck
bun run typecheck

# Remove Redux (Phase 3 only)
bun remove @reduxjs/toolkit react-redux
```

---

## Notes / decisions log

_Use this space to record decisions made during migration._

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-05 | Doc created | Central reference for incremental migration |
| 2026-06-05 | Phase 0 complete | Installed deps, `fetch-client`, `QueryProvider` wraps `ReduxProvider` in layout |
| 2026-06-05 | Presence + blocks migrated | `presence.queries.ts`, `blocks.queries.ts` / `blocks.mutations.ts`; RTK files removed |
| 2026-06-05 | connectionCall + connectionRealtimeSync → Zustand | Redux store down to room, roomActivity, chat + RTK api |
| 2026-06-05 | Tour guide, settings, insights, public profile, RTC → RQ | `invalidatePublicProfileCache`, `invalidateRtcTokenCache` helpers |
| 2026-06-05 | Notifications + explore → RQ | `invalidateNotificationCaches`, `invalidateSuggestedPeopleCache` hybrid helpers |
| 2026-06-05 | Profile setup + matching → RQ | Moved API to `profile-setup/api/`; `patchMatchPeerPreviewCache` uses React Query |
| 2026-06-05 | Connection call + circles → RQ | `invalidateCallConversationMessages` hybrid; `invalidateCirclesCaches` on create/update/delete |
| 2026-06-05 | Connections API + realtime → RQ | `useAcceptedConnections` infinite query; realtime sync invalidates RQ + RTK lists |
| 2026-06-05 | Chat slice → Zustand | `chat-ui.store.ts`; Redux store down to room + roomActivity + RTK api |
| 2026-06-05 | Chat API + socket bridges → RQ | `message-cache-sync.ts`; blocks invalidation includes chat RQ caches |
| 2026-06-05 | room + roomActivity → Zustand | `room.store.ts`, `room-activity.store.ts`; lifecycle coupling via explicit store calls |
| 2026-06-05 | Room + activity API → RQ | `joinRoom` skips RTC invalidation; socket listeners patch via `room-cache-sync.ts` |
| 2026-06-05 | Remove Redux + RTK | Dropped `@reduxjs/toolkit` + `react-redux`; invalidation helpers are RQ-only |
| 2026-06-05 | Post-migration cleanup | Stale RTK/Redux comments and feature READMEs updated |
| | | |
