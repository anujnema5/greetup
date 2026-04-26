# Video Calling Architecture and Debugging Guide

This document explains how video calling works in the client for both:

- **Direct calls** (1:1 match)
- **Circle calls** (group / `db_room`)

It is written for manual code reading, bug-fixing, and quality review.

---

## 1) High-Level Mental Model

The call system is layered:

1. **Matchmaking layer** decides when a room exists and routes user to `/circle/[roomId]`.
2. **Room session layer (Redux)** tracks UI/session intent (`sessionActive`, `activeRoomId`, `phase`).
3. **RTC bootstrap layer** fetches room RTC token and creates Socket.IO connection.
4. **Mediasoup layer** joins room, creates transports, consumes/producers tracks.
5. **Room UI layer** renders direct or circle layout and call controls.

Important rule: UI state (`phase`) and media state (`mediasoup status`) are related but not the same thing.

---

## 2) Core File Map (Where to Read First)

### Matchmaking / room entry

- `client/src/features/matching/hooks/use-app-match-flow.ts`
- `client/src/features/matching/hooks/useFindMatch.ts`
- `client/src/features/matching/providers/matchmaking-provider.tsx`
- `client/src/features/matching/hooks/use-room.ts`
- `client/src/features/room/pages/room-page.tsx`
- `client/src/features/room/hooks/use-room-join-and-start-video.ts`

### Room session and control actions

- `client/src/lib/redux/slices/room-slice.ts`
- `client/src/lib/redux/slices/room-activity-slice.ts`
- `client/src/lib/redux/selectors/room-selectors.ts`
- `client/src/features/room/hooks/use-room-video.ts`
- `client/src/features/room/components/direct-call-partner-disconnect-handler.tsx`
- `client/src/features/room/lib/room-sync.ts`

### RTC + mediasoup

- `client/src/features/rtc/providers/rtc-socket-provider.tsx`
- `client/src/features/rtc/hooks/use-rtc-socket.ts`
- `client/src/features/rtc/hooks/use-mediasoup-room.ts`
- `client/src/features/rtc/hooks/use-mediasoup-room-session.ts`
- `client/src/features/rtc/hooks/use-mediasoup-local-media.ts`
- `client/src/features/rtc/types/mediasoup-room.types.ts`

### UI (split for maintainability)

- `client/src/features/room/components/room-video-layer.tsx`
- `client/src/features/room/components/room-video-view.tsx`
- `client/src/features/room/hooks/use-room-video-view-model.ts`
- `client/src/features/room/components/room-video/room-video-stage.tsx`
- `client/src/features/room/components/room-video/room-video-overlays.tsx`
- `client/src/features/room/components/room-video/room-video-hud.tsx`
- `client/src/features/room/components/room-video/room-video-toolbar.tsx`
- `client/src/features/room/components/room-video/room-video-right-panel.tsx`
- `client/src/features/room/components/room-video/room-video-primitives.tsx`

---

## 3) Redux Room State: Main Variables

Defined in `room-slice.ts` (session UI) and `room-activity-slice.ts` (in-call activities).

### UI

- `ui.sessionActive`: if call session is active from UI perspective.
- `ui.isMinimized`: whether full-screen call is minimized.

### Session

- `session.activeRoomId`: room currently bound to RTC token/socket.
- `session.phase`: `"idle" | "lobby" | "in_call" | "searching"`.
- `session.rtcPrimaryRemoteUserId`: preferred primary remote for direct stage.
- `session.conversationId`: room chat conversation id (if available).

### Media

- `media.status`: `"idle" | "connecting" | "connected" | "error"` (UI-oriented abstraction).

### Key actions and intent

- `enterRoomPage({ roomId })`: sync route room into Redux.
- `startVideoSession(...)`: marks call session active and sets phase `in_call`.
- `endVideoSession()`: full teardown to idle.
- `beginSearchingNextCall()`: **special direct-call recovery action**:
  - keeps `sessionActive = true`
  - sets `phase = "searching"`
  - clears `activeRoomId` to force RTC detach and notify remote via `peerLeft`
- `setRoomPhase(...)`: explicit phase control when needed.

---

## 4) Direct vs Circle: How They Diverge

Room type is inferred from:

- API room payload (`roomType`, `sessionKind`)
- RTC token payload (`rtcRoomType`)

Main helpers:

- `isRoomGroupLayout(...)` in `matching/types/room.types.ts`
- `canUseScreenShare(...)` in RTC policy

### Direct call

- Primary remote stage + local PiP.
- Skip button shown.
- Add-to-circle action can be shown.
- `DirectCallPartnerDisconnectHandler` active.

### Circle call

- Gallery/grid layout from participant roster.
- No skip button.
- No direct partner recovery logic.

---

## 5) End-to-End Flow: Match -> Room -> Media

### A) Match completes

1. `useFindMatch` gets `match:completed`.
2. `useAppMatchFlow` routes to `/circle/[roomId]?peer=...&score=...`.
3. Return path is stored for minimize flow.

### B) Room bootstraps

1. `useRoom` reads route/query + room data (`getRoom`).
2. `useLayoutEffect` dispatches `enterRoomPage({ roomId })`.
3. `room-page` determines direct/circle and starts join flow.
4. `useRoomJoinAndStartVideo`:
   - calls `joinRoom(roomId)`
   - dispatches `startVideoSession(...)`

### C) RTC and mediasoup start

1. `RtcSocketProvider` sees `activeRoomId + sessionActive`.
2. Fetches RTC token (`/room/:id/rtc-token`).
3. `useRtcSocket` connects Socket.IO with JWT.
4. `useMediasoupRoom` + `useMediasoupRoomSession`:
   - join
   - create recv/send transports
   - consume existing producers
   - listen for producer and peer events
5. UI receives streams and statuses through `useRtcSocketContext`.

---

## 6) Mediasoup Variables You Should Know

From `use-mediasoup-room.ts` and `types/mediasoup-room.types.ts`.

### Top-level statuses

- `status`: `"idle" | "connecting_socket" | "joining" | "negotiating" | "ready" | "error"`.
- `error`: failure reason string.

### Stream state

- `localStream`: local merged stream (camera/mic/screen tracks).
- `remoteStreamsByPeerId`: peerId -> stream map.
- `peers`: peer metadata (`displayName`, `image`, `cameraActive`, `micActive`).
- `remoteTrackMediaSource`: track.id -> `"camera" | "screen"` to detect stage mode.

### Feature state

- `micEnabled`, `cameraEnabled`, `screenSharing`.
- `localScreenTrackId`.
- `localMediaDeviceError`.

### Derived view state

- `remoteParticipants`.
- `remoteStream` (main stage stream for direct).
- `mainStageShowsScreen`.
- `remotePeerCameraStream` (inset during screen share).
- `localPreviewStream`.

---

## 7) Local Media Toggle Internals

In `use-mediasoup-local-media.ts`:

- **Mic/Camera toggles**:
  - pause/resume existing producer when possible
  - create producer with `getUserMedia` if needed
  - sync server with `pauseProducer` / `resumeProducer`
- **Screen share toggle**:
  - produces with `getDisplayMedia`
  - stores screen producer id and track id
  - auto-cleans up on track `ended`
- `cleanupLocalScreenShare()`:
  - closes local screen producer
  - removes local screen track
  - sends `closeProducer` ack to server

---

## 8) Skip / End / Minimize Behavior

From `use-room-video.ts`.

### End

- Clears room storage.
- Dispatches `endVideoSession()`.
- Broadcasts `END_CALL` for same-user tabs.
- Calls `/matching/leave-room` (best-effort).
- Routes to `MATCHMAKING_HUB_PATH` (`/explore`).

### Skip (direct)

- Broadcasts `SKIP_CALL` to same-user tabs.
- Dispatches `beginSearchingNextCall()`:
  - keeps full call UI but enters searching mode
  - detaches RTC by clearing `activeRoomId`
- Calls `/matching/leave-room` then `matchmaking.restartSearch()`.

### Minimize

- Marks minimized in sessionStorage.
- Dispatches `minimizeVideoSession()`.
- Navigates to stored return path (or `/` fallback).

Note: `BroadcastChannel` only syncs **tabs of same user**, not remote peer device.

---

## 9) Direct Partner Disconnect Recovery

From `direct-call-partner-disconnect-handler.tsx`.

Only runs in direct rooms.

Key refs/timers:

- `hadRemotePeerRef`: only react if peer was previously present.
- `handledRef`: guard against duplicate recovery.
- `partnerLeft` timer: short debounce for ordering jitter.
- `networkRecovery` timer: grace window for temporary transport/socket drops.
- `searchRetry` timer: retries matchmaking if stuck while phase is searching.

Key constants (`direct-call-recovery.ts`):

- `peerLeftDebounceMs`
- `networkRecoveryTimeoutMs`
- `searchRetryDelayMs`

Important guard:

- phase returns to `in_call` only if matchmaking is `matched`/`proposed` (prevents stale reconnect bounce).

---

## 10) Room Video UI Reading Guide

`RoomVideoView` is now a coordinator:

- state: `rightPanelTab`, `activeActivity`, `stageRatio`, `isLive`
- model: `useRoomVideoViewModel`
- delegates rendering to specialized components

Subcomponents:

- `room-video-stage`: main stage and direct/circle layout switch
- `room-video-overlays`: loading/error/device banners, PiP, insets, score badge
- `room-video-hud`: top controls (ratio/minimize/timer/title)
- `room-video-toolbar`: bottom actions
- `room-video-right-panel`: chat/activities panel
- `room-video-primitives`: reusable visual units/buttons

This split is intended to improve bug isolation and reading speed.

---

## 11) Common Bug Scenarios and Where to Check

### A) “Call ends and navigates wrong page”

Check:

- `use-room-video.ts` (`handleEnd`, routing target)
- `room-page.tsx` (ensure it does not bypass room hook end logic)

### B) “Skip works locally but remote does not leave”

Check:

- `beginSearchingNextCall()` usage
- `activeRoomId` being cleared on skip
- `/matching/leave-room` call path
- remote side `peerLeft` handling in mediasoup + disconnect handler

### C) “Searching briefly then returns to connected”

Check:

- `DirectCallPartnerDisconnectHandler` replacement guard
- transition rule from `searching -> in_call`
- stale peer entries in `peers` map

### D) “No media / black video”

Check sequence:

1. RTC token fetch success
2. `useRtcSocket` state reaches `connected`
3. mediasoup `status` reaches `ready`
4. `remoteStreamsByPeerId` and `peers` are populated
5. `remoteVideoLive` and camera flags

Also verify `joinRoom` does not invalidate RTC token unexpectedly.

### E) “Mic/camera toggle appears broken”

Check:

- `mediaStatus === "ready"` (toggles disabled otherwise)
- producer pause/resume ack path
- `localMediaDeviceError` messages
- browser permission and track `readyState`

---

## 12) Quality Review Checklist (Manual)

When reviewing changes in call code, verify:

1. **Session invariants**
   - `sessionActive` and `activeRoomId` transitions are intentional.
   - `phase` reflects UX state (`in_call`, `searching`, etc.).

2. **Detach semantics**
   - Any path that should notify remote via `peerLeft` must detach RTC (`activeRoomId` cleared or socket disconnected).

3. **No render-time ref writes**
   - Ref `.current` mutation should happen in effects/handlers, not render.

4. **No synchronous setState-only effects**
   - Avoid effects that only reset state; derive from source data when possible.

5. **Direct vs circle guards**
   - Skip and partner-disconnect logic must never affect circles.

6. **Cross-tab vs cross-user distinction**
   - BroadcastChannel sync is local-user tabs only.

7. **Error UX continuity**
   - Media errors and device errors are visible and dismiss behavior is sane.

---

## 13) Suggested Debug Log Points (Optional)

If you need temporary logs for hard bugs, add at:

- `use-room-video.ts`:
  - before/after `beginSearchingNextCall`
  - `handleSkip`, `handleEnd`
- `direct-call-partner-disconnect-handler.tsx`:
  - peer count transitions
  - debounce and recovery timer start/stop
- `use-mediasoup-room-session.ts`:
  - `peerJoined`, `peerLeft`, `newProducer`, transport state changes
- `use-mediasoup-local-media.ts`:
  - toggle path chosen (pause/resume vs produce new)

Remove debug logs after confirming behavior.

---

## 14) TL;DR

- **Room Redux state** controls call intent/UI.
- **RTC token + Socket.IO + mediasoup** control real media transport.
- **Direct and circle** share infrastructure but diverge at UI and recovery logic.
- **`beginSearchingNextCall`** is the key direct-call skip/recovery transition.
- **`RoomVideoView` is now decomposed** to make reading and bug-fixing practical.

