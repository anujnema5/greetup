# Connection call `sessionKind` — implementation spec

**Status:** Approved for implementation — follow phases in order; do not skip.  
**Last updated:** 2026-06-02  
**Canonical path:** `docs/design/connection-call-session-origin.md` (filename says “origin”; content uses **`sessionKind` only**).  
**Product:** Not launched — no production legacy; remove in-repo `db_room` as you go.

---

## 0. START HERE (new Cursor session — read this first)

You do **not** need prior chat history. This file is the full spec.

### 0.1 One-line goal

Add **`rooms.session_kind`** + Redis/API **`sessionKind`** with values `match` | `connection_call` | `circle`, so **DM connection calls** are not treated like **random match** (skip/rematch) or **circles** (`db_room` UI).

### 0.2 Copy-paste prompts (use exactly)

| Step | Prompt to paste in Cursor |
|------|---------------------------|
| **First PR (server)** | `Implement Phase 0, Phase 1a, and Phase 1b from docs/design/connection-call-session-origin.md. Follow the doc only. Run server migration, typecheck, and grep gate in §0.5.` |
| **Second PR (client parse)** | `Implement Phase 2 from docs/design/connection-call-session-origin.md.` |
| **Third PR (UI)** | `Implement Phase 3 from docs/design/connection-call-session-origin.md.` |
| **Fourth PR (leave/skip)** | `Implement Phase 4 and Phase 5 from docs/design/connection-call-session-origin.md.` |
| **Fifth PR (hardening)** | `Implement Phase 6 from docs/design/connection-call-session-origin.md.` |

Do **one phase group per PR** unless the user asks to combine. After each PR, report which §6 matrix rows were validated.

### 0.3 Repo layout (paths are from monorepo root)

| Area | Path |
|------|------|
| Server (Hono API) | `server/` |
| Client (Next.js) | `client/` |
| RTC / mediasoup | `rtc-service/` |
| This spec | `docs/design/connection-call-session-origin.md` |

### 0.4 Critical entry points (where bugs are today)

| Feature | Server | Client |
|---------|--------|--------|
| Connection call create | `server/src/modules/connections/services/connection-call.service.ts` | `client/src/features/connection-call/hooks/use-connection-call-actions.ts` |
| Room create (match) | `server/src/modules/rooms/repositories/room-creation.repository.ts` (`createMatchPairRoom`) | — |
| Room create (connection) | same file (`createConnectionCallRoom`) | — |
| Redis room hash | `server/src/modules/rooms/services/rtc/session-room-redis.service.ts` | — |
| GET room | `server/src/modules/rooms/controllers/room.controller.ts` | `client/src/features/matching/hooks/use-room.ts` |
| In-call UI | — | `client/src/features/room/call/shell/in-call-container.tsx` |
| Skip / rematch on peer leave | — | `client/src/features/room/listeners/on-partner-disconnected.tsx` |
| Skip / end buttons | — | `client/src/features/room/hooks/session/use-room-video.ts` |
| Room types / parse | — | `client/src/features/matching/types/room.types.ts` |
| Expand match → circle | `server/src/modules/rooms/repositories/expand-direct-room.repository.ts` | `client/src/features/room/listeners/on-direct-expanded-to-circle.tsx` |

### 0.5 Grep gates (run before marking a phase done)

From repo root (or `client/` / `server/` as noted):

```bash
# Must trend to ZERO new occurrences (refactor existing as part of phases 1b–2):
rg "db_room" server client --glob "!**/.next/**" --glob "!**/migration/**"

# Must not appear in new code:
rg "session_origin|sessionOrigin" server client

# After Phase 1a+, inserts must set session_kind:
rg "insert\(rooms\)|\.insert\(rooms\)" server/src
```

### 0.6 Verify commands

```bash
cd server && bun run typecheck    # or project’s DB migrate + test script
cd client && bun run typecheck
cd client && bun run eslint path/to/changed/files
```

Apply DB migration after Phase 1a (see §5.1). If local DB is messy and not launched, resetting dev DB is OK.

### 0.7 Phase dependency graph

```
Phase 0 (helpers/tests, optional first)
    ↓
Phase 1a (Postgres session_kind)  ── MUST be before 1b
    ↓
Phase 1b (Redis + GET /room)
    ↓
Phase 2 (client parse)  ── MUST be before 3–5
    ↓
Phase 3 → Phase 4 → Phase 5  (UI then leave then disconnect)
    ↓
Phase 6 (hardening)
```

### 0.8 Agent rules (do not improvise)

1. **Only** implement the phase(s) named in the user message.  
2. **PG column:** `session_kind`. **Redis/JSON/TS property:** `sessionKind`. **Same enum strings:** `match` | `connection_call` | `circle`.  
3. **Never** add `session_origin`, `sessionOrigin`, or `db_room` in new code.  
4. **Do not** change RTC `roomType` enum (stay `direct` | `circle`).  
5. **Do not** add `room_type = connection` in Postgres.  
6. **Branch behavior** on `sessionKind`, not on `room_type === 'direct'` alone.  
7. **Circle layout** = `sessionKind === 'circle'` (or `rtcRoomType === 'circle'`), **not** “has Postgres row”.  
8. **Connection call:** no skip, no `beginSearchingNextCall`, no `matchmaking.restartSearch` on hangup/peer leave.  
9. **Match:** keep skip + rematch behavior unchanged.  
10. **Expand to circle:** set `session_kind` and `sessionKind` to `circle` with `room_type` / RTC circle.  
11. Minimize unrelated refactors; no drive-by NSFW or env flag changes unless in scope.  
12. End with: files changed, phases completed, §6 rows checked, grep gate results.

### 0.9 Product defaults (locked — do not ask unless user overrides)

- Hang up connection call → return to **conversation** when `conversationId` exists (`setRoomReturnPath` in `use-connection-call-actions.ts`).  
- **No** add-to-circle from `connection_call`.  
- **No** embedded activities/chess on `connection_call`.  
- **No** expand connection call to circle in this project phase.

### 0.10 What “done” looks like (acceptance)

- New connection call: DB `session_kind = connection_call`, Redis `sessionKind = connection_call`, in-call **no skip**, hang up **does not** open match search.  
- New match: `session_kind = match`, skip + rematch still work.  
- Circle: `session_kind = circle`, gallery/lobby unchanged, NSFW only on circles.  
- `rg db_room` shows no **writes** and no **client branches** on `db_room` (reads may remain only in comments until cleaned).

---

## Naming decision (locked)

**One concept, one enum — casing only differs by layer (not legacy aliases).**

| Layer | Field name | Enum values (same strings everywhere) |
|-------|------------|--------------------------------------|
| **Postgres** | `rooms.session_kind` | `match` \| `connection_call` \| `circle` |
| **Redis** hash | `sessionKind` | `match` \| `connection_call` \| `circle` |
| **GET `/room` JSON** | `sessionKind` | `match` \| `connection_call` \| `circle` |
| **Client / Drizzle** | `sessionKind` → column `session_kind` | same |

- **Do not** add `session_origin`, `sessionOrigin`, or a second DB column.
- **Do not** use `db_room`, `match_direct`, or `circle_hosted` in new code — replace with `circle` / `match` / `connection_call`.
- **Pre-launch:** no production legacy; refactor in-repo `db_room` usages as part of implementation (no long-term compat layer).

**Separate field (unchanged):** `room_type` = `direct` \| `circle` (topology, expiry, RTC shape).  
**Separate field (unchanged):** RTC JWT `roomType` = `direct` \| `circle`.

---

## 1. Why this doc exists

Connection calls (video/audio to an **accepted connection** / DM) and **match** 1:1 calls both use Postgres `room_type = direct` and RTC `roomType = direct`, but product rules differ sharply:

| Behavior | Match 1:1 | Connection call | Circle |
|----------|-----------|-----------------|--------|
| Skip / next partner | Yes | **No** | No |
| Peer leaves → rematch search | Yes | **No — end for both** | No (empty slots OK) |
| Match score in UI | Yes | No | No |
| Add-to-circle from call | Often yes | TBD (likely no initially) | N/A |
| NSFW circle moderation | No | No | Yes (when enabled) |

Today, connection calls are provisioned with Redis `sessionKind: "db_room"` (wrong). Client code often treats any `db_room` as “circle UI,” which breaks DM calls. This spec adds **`session_kind` / `sessionKind`** so behavior branches on **product kind**, not on `room_type = direct` alone.

**Principle:** Same RTC topology (`direct`) ≠ same product session. Branch on **`sessionKind`**, not on Postgres `room_type` alone.

---

## 2. Goals and non-goals

### Goals

- Add Postgres **`rooms.session_kind`** enum (source of truth).
- Write the **same value** to Redis `sessionKind` and GET `/room`.
- Use **`connection_call`** distinct from **`match`** and **`circle`**.
- Remove **`db_room`** from new Redis writes and client branching.
- Fix layout / skip / leave / disconnect for connection calls only.
- Preserve match and circle behavior (regression matrix §6).

### Non-goals (unless added later)

- New RTC room type (stay `direct` / `circle`).
- Third Postgres `room_type` value — use `session_kind` instead.
- Connection-call ringing UX redesign beyond join/leave needs.
- NSFW on DM calls.

---

## 3. Vocabulary

| Field | Where | Values | Meaning |
|-------|--------|--------|---------|
| **`session_kind` / `sessionKind`** | PG + Redis + API | `match` \| `connection_call` \| `circle` | **Why** this room exists |
| **`room_type`** | Postgres | `direct` \| `circle` | 1:1 vs group shape, caps, join rules |
| **RTC `roomType`** | JWT / mediasoup | `direct` \| `circle` | Media topology |

### Target matrix

| Product | `session_kind` (PG) | `sessionKind` (Redis/API) | `room_type` | RTC |
|---------|---------------------|---------------------------|-------------|-----|
| Random match 1:1 | `match` | `match` | `direct` | `direct` |
| Connection DM call | `connection_call` | `connection_call` | `direct` | `direct` |
| Hosted / scheduled circle | `circle` | `circle` | `circle` | `circle` |
| Match expanded → circle | `circle` (after expand) | `circle` | `circle` | `circle` |

**Rules:**

- Connection calls: never `sessionKind: db_room`.
- Match + connection both use `room_type = direct`; distinguish only via `session_kind`.
- Expand match → circle: update `room_type` → `circle` **and** `session_kind` → `circle` in one transaction; Redis `sessionKind` → `circle`, `roomType` → `circle`.

---

## 4. Current state (baseline — known issues)

### 4.1 Server

- `rooms` has **`room_type` only** — no `session_kind` yet.
- `createConnectionCallRoom` / `createMatchPairRoom` → both `roomType: "direct"` (indistinguishable in DB).
- Connection provision → Redis `sessionKind: "db_room"` (wrong; should be `connection_call`).
- Circles → Redis `sessionKind: "db_room"` (rename target: `circle`).

### 4.2 Client

- `useRoom`: `sessionKind === "db_room"` → `peerId` null (bootstrap workaround).
- `isRoomGroupLayout`: treats `db_room` as group → wrong for connection.
- `showSkip={!isGroupRoom}` → should be `sessionKind === "match"`.
- `OnPartnerDisconnected`: rematch for all direct RTC — wrong for `connection_call`.
- `leaveRoomAndClear`: `db_room` → `leaveCircleRtc` — wrong for connection.

### 4.3 Cross-read

- [video-calling-architecture-and-debugging.md](../realtime/video-calling-architecture-and-debugging.md)
- [webrtc-direct-and-circle-call-flow.md](../realtime/webrtc-direct-and-circle-call-flow.md)
- [room-session-lifecycle-hinglish.md](./room-session-lifecycle-hinglish.md)
- [chat-system-design.md](./chat-system-design.md)

---

## 5. Target architecture

### 5.0 Read / write order

```
CREATE
  INSERT rooms (room_type, session_kind)
  Redis HSET sessionKind = <same enum string>

GET /room/:id
  1. Postgres rooms.session_kind  (authoritative)
  2. Redis sessionKind, lobbyGateActive, …
  3. If Redis missing → build from Postgres + participants
  4. JSON: { sessionKind: "<value>" }   // camelCase in API only

CLIENT
  parseRoomData → room.sessionKind
  helpers: isMatchSession / isConnectionCallSession / isCircleSession
```

### 5.1 Postgres schema

**Migration** (e.g. `0028_rooms_session_kind.sql`):

```sql
CREATE TYPE session_kind AS ENUM ('match', 'connection_call', 'circle');

ALTER TABLE rooms
  ADD COLUMN session_kind session_kind;

CREATE INDEX rooms_session_kind_idx ON rooms (session_kind);
```

**Drizzle** (`server/src/core/database/schema/rooms.ts`):

```ts
export const sessionKindEnum = pgEnum("session_kind", [
  "match",
  "connection_call",
  "circle",
]);

sessionKind: sessionKindEnum("session_kind").notNull(), // NOT NULL on new installs
```

| Creation path | `session_kind` | `room_type` |
|---------------|----------------|-------------|
| `createMatchPairRoom` | `match` | `direct` |
| `createConnectionCallRoom` | `connection_call` | `direct` |
| Create / schedule circle | `circle` | `circle` |

**Dev-only backfill** (if local DB has rows): `room_type = circle` → `circle`; connection-call meta → `connection_call`; else direct → `match`. Production not launched — prefer reset DB over complex backfill.

### 5.2 Match → circle expand

- `room_type`: `direct` → `circle`
- `session_kind`: `match` → `circle`
- Redis: `sessionKind` → `circle`, `roomType` → `circle`

### 5.3 Client helpers

`client/src/features/room/lib/session/room-session-kind.ts`:

```ts
isMatchSession(room): boolean       // sessionKind === 'match'
isConnectionCallSession(room): boolean
isCircleSession(room): boolean     // sessionKind === 'circle'
getSessionKind(room): 'match' | 'connection_call' | 'circle' | null
```

**`isCircleGroupSession` (layout)** = `sessionKind === 'circle'` OR `rtcRoomType === 'circle'` (not `db_room`).

**Retire:** `isCircleRoomData` meaning “any db_room payload” — split into typed `RoomData` unions per `sessionKind`.

### 5.4 Redis provision

| Kind | Redis `sessionKind` | Redis `roomType` | Extra hash fields |
|------|---------------------|------------------|-------------------|
| Match | `match` | `direct` | `userA`, `userB`, … (existing) |
| Connection | `connection_call` | `direct` | `conversationId` |
| Circle | `circle` | `circle` | `lobbyGateActive`, … |

Replace `provisionSessionRoomRedis` circle path: write `sessionKind: "circle"` not `db_room`.

### 5.5 GET `/room` — `connection_call` example

```json
{
  "sessionKind": "connection_call",
  "roomId": "...",
  "hostUserId": "...",
  "roomType": "direct",
  "conversationId": "...",
  "title": "Call",
  "lobbyGateActive": "0"
}
```

**Match** (Redis-style, no PG row required for pair metadata): `sessionKind: "match"`, `userA`, `userB`, `matchScore`, …

**Circle:** `sessionKind: "circle"`, `hostUserId`, `roomType: "circle"`, …

### 5.6 Client `RoomData`

Unions keyed by `sessionKind`:

- `"match"` — existing pair shape + optional `roomType` when expanded
- `"connection_call"` — `hostUserId`, `conversationId`, `roomType: "direct"`
- `"circle"` — replaces old `sessionKind: "db_room"` circle payload (same fields, new discriminator)

---

## 6. Behavior matrix (must not regress)

| # | Scenario | Expected |
|---|----------|----------|
| M1 | Match completes | 1:1 layout, skip, rematch on skip |
| M2 | Match → peer disconnect | Search + `restartSearch` |
| M3 | Match → expand to circle | Circle layout, `sessionKind: circle` |
| M4 | Match → add-to-circle | Works on `sessionKind === match` only |
| M5 | Match minimize → restore | Dock OK |
| C1 | Connection call accepted | 1:1, **no skip** |
| C2 | Connection hang up | End both, messages, **no search** |
| C3–C4 | Decline / cancel / miss | Room ended, no rematch |
| C5 | Refresh on `/circle/[roomId]` | Rejoin, `sessionKind: connection_call` |
| C6 | Connection peer RTC drop | End both, not rematch |
| C7 | Busy flags | Unchanged |
| G1–G3 | Circle lobby / leave / host end | Unchanged |
| G4 | NSFW | `sessionKind === circle` only |
| X1 | Search preview | No session |
| X2 | Profile → call | `connection_call` |
| X3 | Tab lease | Unchanged |
| X4 | Redis expired, PG live | GET from `session_kind` |
| X5 | SQL analytics | `WHERE session_kind = 'connection_call'` |
| X6 | Expand → circle | `session_kind` + `room_type` → `circle` |

---

## 7. Phased implementation

### Phase 0 — Helpers + tests (no behavior change)

- [ ] `room-session-kind.ts` + unit tests for three kinds.
- [ ] Grep inventory: all `db_room` / `sessionKind` branches.

**Gate:** CI green.

---

### Phase 1a — Postgres `session_kind`

- [ ] Migration + Drizzle `sessionKindEnum` / `session_kind` column.
- [ ] Set on every `room-creation.repository` insert.
- [ ] Expand-direct: `match` → `circle`.
- [ ] Dev backfill optional.

**Gate:** `SELECT session_kind, room_type, COUNT(*) FROM rooms GROUP BY 1,2` looks correct.

---

### Phase 1b — Server Redis + GET `/room`

- [ ] Connection: PG `connection_call` + Redis `sessionKind: connection_call`.
- [ ] Circle provision: `sessionKind: circle` (remove `db_room` writes).
- [ ] Match: `sessionKind: match` unchanged.
- [ ] GET `/room` branches on `session_kind` / `sessionKind`; refactor `db_room` reads to `circle`.
- [ ] Shared type `SessionKind = 'match' | 'connection_call' | 'circle'` in `server/src/shared/types/`.

**Gate:** X4, X5, X6; new connection + circle + match smoke.

**Suggested command:** *“Implement Phase 0, 1a, and 1b from `docs/design/connection-call-session-origin.md`.”*

---

### Phase 2 — Client parse + classify

- [ ] `room.types.ts` — three `sessionKind` unions; drop `db_room`.
- [ ] `parseRoomData`, `useRoom` peerId for `connection_call`.
- [ ] `isRoomGroupLayout` → `sessionKind === 'circle'`.
- [ ] Replace `isCircleRoomData` misuse.

**Gate:** C5, G1, M1 layouts.

---

### Phase 3 — Call shell UI

- [ ] `showSkip={isMatchSession(room)}`
- [ ] `showAddToCircle` only for `match`
- [ ] `shouldStartVideo` without match query params for `connection_call`

**Gate:** C1, M1, M4.

---

### Phase 4 — Leave / end / skip

- [ ] Skip / search only when `sessionKind === 'match'`
- [ ] Connection end → `leaveRoom` + conversation route
- [ ] Dock: no skip for `connection_call`

**Gate:** C2, C6, M2, M5.

---

### Phase 5 — `OnPartnerDisconnected`

- [ ] `connection_call` → end call path
- [ ] `match` → existing rematch
- [ ] `circle` → early return (unchanged)

**Gate:** C6, M2, G2.

---

### Phase 6 — Hardening

- [ ] `session_kind NOT NULL` on `rooms` (if any nullable dev rows cleaned).
- [ ] Hangup ends connection room when last participant leaves.
- [ ] E2E / analytics on `session_kind`.
- [ ] Confirm zero `db_room` in codebase (grep gate).

---

## 8. Edge cases (summary)

| Case | Mitigation |
|------|------------|
| Caller ringing, 1 participant | GET from PG `connection_call` + bootstrap `peerId` |
| Redis TTL, PG live | GET uses `session_kind` |
| Expand connection → circle | Out of scope; block add-to-circle |
| Wrong leave API | `connection_call` → `leaveRoom`; `circle` → `leaveCircleRtc` |
| In-repo `db_room` during refactor | Phase 1b + 2 remove reads/writes |

---

## 9. File inventory

**Re-grep before merge:** `db_room|session_origin|sessionKind|isCircleRoomData`

### Server

`schema/rooms.ts`, `migration/0028_rooms_session_kind.sql`, `room-creation.repository.ts`, `rooms.repository.ts`, `expand-direct-room.repository.ts`, `connection-call.service.ts`, `session-room-redis.service.ts`, `room.controller.ts`, `join-room.service.ts`, `issue-rtc-token.service.ts`, `expand-direct-room.service.ts`, `matchmaking.service.ts`

### Client

`room.types.ts`, `room-session-kind.ts`, `room-page.tsx`, `in-call-container.tsx`, `use-room.ts`, `use-room-video.ts`, `on-partner-disconnected.tsx`, `minimized-room-dock.tsx`, `use-connection-call-actions.ts`, `on-direct-expanded-to-circle.tsx`

---

## 10. Testing protocol

Per phase: `typecheck`, `eslint`, §6 rows, smoke (match + connection + circle).

**Stop ship:** skip on connection call; search after DM hangup; `db_room` in new Redis writes; circle shows match layout.

---

## 11. Rollback

Pre-launch: revert migration + branch. If column exists, GET can still read `session_kind`.

---

## 12. Product defaults

| Question | Default |
|----------|---------|
| End call navigation | Conversation when `conversationId` set |
| Add-to-circle from connection | No |
| Activities on connection | No |
| Expand connection → circle | No |

---

## 13. Agent instructions (summary)

Full rules: **§0.8**. Read **§0** before coding. Implement only the phase the user names. Report §6 matrix + §0.5 grep after each PR.

---

## 14. Changelog

| Date | Change |
|------|--------|
| 2026-06-02 | Initial spec |
| 2026-06-02 | **Locked:** PG `session_kind`, Redis/API `sessionKind`; enum `match` \| `connection_call` \| `circle`; drop `db_room` |
| 2026-06-02 | **§0 START HERE** for new Cursor sessions: prompts, paths, grep gates, phase graph, acceptance |
