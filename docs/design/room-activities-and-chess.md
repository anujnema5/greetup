# Room activities and chess — how it works

Plain-language map of the code paths: what “activity mode” means on the client, how chess differs from a generic activity, and how HTTP + Redis + sockets fit together.

---

## 1. Two layers of “activity” on the client

**A) Local UI state (React `useState` in `RoomVideoView`)**

- The user picks an activity from the right panel (e.g. “Chess”).
- That sets `activeActivity` to an id like `"chess"`.
- This only drives **which panel to show** and **which `ActivityStage` branch** to render until something “real” takes over.

**B) Shared realtime state (Redux `roomActivity.active`)**

- Field: `roomActivity.active` — either `null` or a **`RoomChessActivityState`** object (`kind: "chess"`, `gameId`, `roomId`, white/black user ids, `fen`, `turn`, `moveNumber`, last move fields, etc.).
- This is what **both players** must agree on for chess. It is updated when:
  - The socket says the game **started**, **moved**, or **ended** (see `ChessSocketBridge`).
  - The inviter might also get state from API responses depending on flow; the **canonical updates for the other player** are mostly socket-driven.

**How they combine**

- In `RoomVideoView`, `stageActivity` is **`"chess"` if Redux has an active chess game**, otherwise it falls back to the local `activeActivity` picker.
- So: you can open the chess tile locally, but the stage **locks to chess** once Redux holds `roomActivity.active.kind === "chess"` until the game ends and `setActiveActivity(null)` runs.

Files to read:

- `client/src/features/room/components/room-video-view.tsx` — `stageActivity`, passes `activeRealtimeActivity` down.
- `client/src/lib/redux/slices/room-activity-slice.ts` — `setActiveActivity`.
- `client/src/lib/redux/types/activity-slice.types.ts` — `RoomChessActivityState` (also re-exported from `room-slice.types.ts`).

---

## 2. Rendering: from video stage to chess board

- `RoomVideoStage` decides whether to show normal video or `ActivityStage`.
- `ActivityStage` switches on `activity.id`:
  - **`"chess"`** → `ChessActivityStage` with `chessActivity={activeRealtimeActivity if kind === "chess" else null}`.
  - Anything else → `GenericActivityStage` (placeholder-style activity).

So chess is the only activity with a **dedicated** UI and **Redux-backed** game state today.

Files:

- `client/src/features/room/components/room-activity/activity-stage.tsx`
- `client/src/features/activity/chess/components/chess-activity-stage.tsx`

---

## 3. Chess on the client: board + API

**Board**

- `react-chessboard` shows the position from **`chessActivity.fen`** (or starting FEN if null).
- **chess.js** (`Chess` instance from that FEN) is used locally to:
  - Validate clicks/drags.
  - Compute legal moves (dots / highlights).
  - Detect game over and who won (checkmate path) before sending to the server.

**Submitting a move**

- On a valid move, the client calls **RTK Query** `useRoomChessMoveMutation`, which POSTs to:

  `POST /api/room/:roomId/activity/chess/move`

- Body includes: `from`, `to`, `san`, `fen`, `turn`, `isGameOver`, `winnerUserId`, `result`, etc.

**Important trust note**

- The **server checks** room membership, direct-room rules, **whose turn** it is (`turnUserId` in Redis), and game id match.
- It **stores the FEN and move metadata the client sends**; it does not re-run a full chess engine on the server in this codebase. So correctness relies on the client’s chess.js + server turn checks. Hardening would mean validating moves against stored FEN on the server.

Files:

- `client/src/features/activity/api/activity-api.ts`
- `client/src/lib/api/endpoints.ts`

---

## 4. Sockets: why they exist alongside REST

REST is good for **actions with a request/response** (invite, accept move, resign). Sockets are used so the **other participant** gets updates **without polling**.

Server event names (must match client):

- `room:chess_invite`
- `room:chess_declined`
- `room:chess_started`
- `room:chess_moved`
- `room:chess_draw_offered`
- `room:chess_draw_rejected`
- `room:chess_ended`

Client listener hub:

- `client/src/features/activity/chess/components/chess-socket-bridge.tsx` — subscribes once per socket, uses `useEffectEvent` so handlers always see latest Redux/session without re-subscribing every render.

Typical flow:

1. Inviter calls **invite** API → server writes Redis **pending invite**, emits **`chess_invite`** to invitee.
2. Invitee sees dialog; **accept** → **respond** API → server creates **active game** in Redis, emits **`chess_started`** to **both** → clients dispatch `setActiveActivity({ kind: "chess", ... })`.
3. Either player moves → **move** API → server updates Redis (or clears it on game over), emits **`chess_moved`** or **`chess_ended`**.
4. Draw: **draw-offer** / **draw-respond** APIs + **`draw_offered`** / **`draw_rejected`** / **`ended`** as appropriate.
5. Resign: **end** API → **`chess_ended`** with `result: "resign"`.

Server definitions:

- `server/src/modules/rooms/constants/chess-socket.events.ts`
- `server/src/modules/rooms/socket/activity-socket.handler.ts` — emit helpers.

---

## 5. Server: routes and Redis keys

**HTTP routes** (mounted under your room API prefix, e.g. `/api/room`):

- `POST .../activity/chess/invite`
- `POST .../activity/chess/respond`
- `POST .../activity/chess/end`
- `POST .../activity/chess/move`
- `POST .../activity/chess/draw-offer`
- `POST .../activity/chess/draw-respond`

File: `server/src/modules/rooms/routes/room-activity.route.ts`

**Redis (in `chess-activity.service.ts`)**

- **Pending invite for room:** `room:chess:pending:{roomId}` — short TTL, prevents double invites.
- **Invite payload:** `room:chess:invite:{requestId}` — who invited whom, status.
- **Active game:** `room:chess:active:{roomId}` — hash with `gameId`, players, `fen`, `turn`, `turnUserId`, `moveNumber`, last move fields, etc. Longer TTL (hours).
- **Draw offer:** `room:chess:draw:{roomId}:{gameId}` — tracks pending draw.

**Direct room only**

- `ensureDirectRoomActivityContext` enforces that chess runs in a **1:1 direct** room context (not arbitrary group rooms).

File: `server/src/modules/rooms/services/chess-activity.service.ts`

---

## 6. Move and game-over logic (server side, short version)

**Move (`moveDirectRoomChessGame`)**

1. Load active game from Redis; verify `gameId`, participants, **`turnUserId === mover`**.
2. If client says **`isGameOver`**: delete active game key, emit **`chess_ended`** with `winnerUserId` / `result` from client payload.
3. Else: increment `moveNumber`, save new `fen`, `turn`, `turnUserId`, `lastMoveSan`, `lastMoveAt`, emit **`chess_moved`** to both players.

**Resign (`endDirectRoomChessGame`)**

- Deletes active game; emits **`chess_ended`** with `result: "resign"` and `winnerUserId` set to the **other** player.

---

## 7. End-to-end checklist (mental model)

| Step | Client | Server |
|------|--------|--------|
| Open chess tile | Local `activeActivity` | — |
| Game actually running | Redux `activity.active` + FEN | Redis `room:chess:active:...` |
| Invite | API + optional UI | Redis invite + socket to peer |
| Sync position | Socket `moved` / initial `started` | Updates Redis, emits socket |
| Your move | chess.js + move API | Turn check, persist FEN, emit |
| Resign / draw / mate | End / draw APIs + sockets | Clears keys, emits `ended` |

---

## 8. Files worth bookmarking

| Area | Path |
|------|------|
| Redux chess shape | `client/src/lib/redux/types/room-slice.types.ts` |
| Socket bridge | `client/src/features/activity/chess/components/chess-socket-bridge.tsx` |
| Board UI + move mutation | `client/src/features/activity/chess/components/chess-activity-stage.tsx` |
| Socket payload types | `client/src/features/activity/chess/types/chess-socket.types.ts` |
| Chess service + Redis | `server/src/modules/rooms/services/chess-activity.service.ts` |
| Room activity routes | `server/src/modules/rooms/routes/room-activity.route.ts` |

---

*Last aligned with the codebase layout described above; if routes or prefixes change, grep for `roomActivityRoute` and `CHESS_SOCKET_EVENTS` to re-verify.*
