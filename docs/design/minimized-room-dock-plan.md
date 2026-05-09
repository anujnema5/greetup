# Minimized room dock — design plan & implementation tasks

This document captures the **product rules**, **technical context**, and **checklist** for the in-app minimized call dock (`MinimizedRoomDock`). Use it when implementing or reviewing so behavior stays consistent with the full room UI and rtc-service signaling.

**Related code (client)**

- `client/src/features/room/components/minimized-room-dock.tsx` — dock UI, controls, drag
- `client/src/features/rtc/providers/rtc-socket-provider.tsx` — session stays alive while Redux `sessionActive`
- `client/src/features/room/hooks/use-room-video.ts` — minimize navigates away, markers + BroadcastChannel
- `client/src/features/rtc/hooks/use-mediasoup-room.ts` — `remoteMediaStream`, `dominantSpeakerPeerId`, `remoteParticipants`
- `client/src/features/rtc/lib/remote-participant-streams.ts` — `pickPrimaryRemoteStream`
- `client/src/features/room/lib/dominant-speaker-tile.ts` — `isDominantSpeakerLocalUser`, etc.

**Related code (server)**

- `rtc-service/src/peers/dominant-speaker-broadcast.ts` — mic-only dominant speaker, Socket.IO `dominantSpeaker`

---

## Goals

1. While minimized, the **call stays active** in the frontend: signaling, mediasoup, and **audio** continue to work.
2. The dock **video area** shows the right **single-tile** focus:
   - **Screen share** on the main surface when someone is sharing (with camera inset when the product already models that).
   - Otherwise: **pinned participant** if the user pinned someone in the full UI; if **not** pinned, **dominant speaker** (mic-based from server).
3. Behavior matches what we discussed: **pin overrides dominant**; **share overrides both** for what appears as the main shared content.
4. Handle **silence** (server clears dominant), **local user as dominant** in group calls, and avoid unnecessary **tile flicker**.

---

## Current architecture (baseline)

- **Minimize** sets Redux `isMinimized`, marks storage, and `router.replace` to the return path (e.g. `/home`). The full room route is left, but **`selectIsVideoSessionActive`** remains true.
- **`RtcSocketProvider`** keeps mediasoup enabled while `sessionActive` and socket connected, so the dock can use **`useRtcSocketContext()`** with the same streams as the full call.
- The dock is shown when **`isActive && isMinimized && !pathname.startsWith("/circle/")`** (hidden on the full room URL).
- Today, the **composed** `remoteMediaStream` in context is driven mainly by **`rtcPrimaryRemoteUserId`** (pin) via `pickPrimaryRemoteStream` — **not** by dominant speaker. Implementing “dominant when not pinned” requires **dock-specific selection** (or a dedicated derived stream) so the full-room stage is unchanged unless you intentionally unify behavior later.

---

## Server: what “dominant speaker” means

From rtc-service (`dominant-speaker-broadcast.ts`):

- **Mic only** — display-capture / screen-share audio producers are **excluded** from dominant UI.
- Driven by mediasoup **AudioLevelObserver** (loudest mic).
- Clients receive updates on **`dominantSpeaker`** with **`{ peerId: string | null }`**.
- **`peerId: null`** is emitted on **silence** (not just “no change”).

**Implication:** the client **must not** treat `null` as “show a random tile.” Use a **fallback** (see policy below).

---

## Dock tile selection policy (authoritative)

Order of precedence for **what to render in the dock’s main video region**:

| Priority | Condition | What to show |
|----------|-----------|--------------|
| 1 | **Screen share active** (same rules as main stage: `mainStageShowsScreen` / focused share tile) | **Shared screen** in the main area; **camera inset** when applicable (`remotePeerCameraStream` / existing direct helpers). Must stay aligned with **focused** share if multiple shares exist. |
| 2 | **User pinned someone** (`rtcPrimaryRemoteUserId` set) | That participant’s **video or avatar tile** (and **local** preview if the pin is self — if pinning self is possible). |
| 3 | **Not pinned** | **Dominant speaker** from `dominantSpeakerPeerId`: their **video or avatar**. |
| 4 | **Dominant is null** (silence) | **Sticky last non-null dominant** for a short window (e.g. 3–5s — tune in implementation), then fall back to **stable default** (e.g. first remote in stable order, matching `pickPrimaryRemoteStream` without preference). |
| 5 | **Dominant is local user** (group) | **Local** camera / composite preview or avatar — not a blank or wrong remote. Use `isDominantSpeakerLocalUser` from `dominant-speaker-tile.ts` and `localMediaStream` (and existing “camera off” semantics). |

**1:1 (direct) calls — optional simplification**

- Product default discussed: still **pin → dominant → fallback**.
- If dominant flipping between two people in 1:1 feels noisy, a follow-up task can **always show the remote** when `!isGroupRoom` and no share; document the choice in code comments once decided.

---

## Audio

- **Requirement:** all remote (and local) audio continues to behave as today when minimized; the dock does not mute the session.
- **Consistency:** if the main app plays audio from a **single** composed stream tied to “primary,” verify after visual changes that **everyone’s audio** is still audible in group calls, or document that the dock is **visual-only** re-targeting while audio remains mixed elsewhere. Adjust if QA finds mismatch between **who you see** and **who sounds centered** (optional polish).

---

## UX polish (recommended, not blocking v1)

- **Debounce / minimum display time** (e.g. ~1s) when switching dominant-driven tiles to reduce jitter in cross-talk.
- Small **context hint** when useful: e.g. “Sharing” when stage is share-only; avoid clutter.
- **Accessibility:** consider a **live region** or label update when the dock focus changes (screen reader).

**Out of scope for this plan (unless explicitly added later)**

- **Browser / OS Document Picture-in-Picture** as the primary minimized experience (different API, permissions, and support). The in-app dock remains the default.

---

## Implementation tasks (for Cursor / developers)

Work in order where dependencies exist; parallelize verification and polish.

### Phase A — Baseline & verification

- [ ] **A1.** Confirm minimize flow: Redux `minimizeVideoSession`, `markRoomMinimized`, navigation to return path, **`sessionActive` stays true**.
- [ ] **A2.** Confirm `MinimizedRoomDock` mounts on non-`/circle/` routes with `useRtcSocketContext()` receiving **ready** mediasoup state and **live** streams.
- [ ] **A3.** Confirm **audio** still plays when dock is visible (desktop + one mobile browser smoke test).
- [ ] **A4.** Document any known failure (e.g. tab background throttling) in a short comment near the dock or in this doc’s “Known limits” subsection.

### Phase B — Dock stage selection (non-share)

- [x] **B1.** Hook + lib: `use-minimized-dock-main-stage.ts`, `minimized-dock-focus.ts` — **`dockFocusPeerId`**: pin → debounced dominant → silence sticky → first remote (`MINIMIZED_DOCK_*` constants).
- [x] **B2.** Map focus peer + `currentUserId` to **main / side** `MediaStream` (local preview when self dominant; else remote participant stream).
- [x] **B3.** `CameraOffAvatar` + `TileSpeakingRings` in `minimized-room-dock.tsx` (same primitives as full-room tiles).
- [x] **B4.** Dominant **debounce** (`MINIMIZED_DOCK_DOMINANT_DEBOUNCE_MS`) + **silence sticky** (`MINIMIZED_DOCK_SILENCE_STICKY_MS`).

### Phase C — Screen share alignment

- [x] **C1.** When `mainStageShowsScreen`, main video uses context **`remoteMediaStream`**; peer inset unchanged.
- [x] **C2.** No separate dock focus for share — compositor already follows **`focusedScreenShareKey`** (same as big stage).
- [ ] **C3.** Manual test: local share, remote share, multiple shares if supported.

### Phase D — Edge cases & room modes

- [x] **D1.** **Group / circle:** self on main when `dockFocusPeerId === currentUserId`; side strip shows another remote when main is self.
- [x] **D2.** **Direct 1:1:** same pin → dominant → fallback as group (documented in `use-minimized-dock-main-stage.ts`). Optional “always remote” simplification not used.
- [x] **D3.** **Pinned + share:** main = share composite from context; pin/dominant do not replace share surface.

### Phase E — QA checklist

- [ ] **E1.** Minimize during call → navigate app → **expand** returns to `/circle/{roomId}` with state intact.
- [ ] **E2.** End call from dock clears dock and tears down session.
- [ ] **E3.** Silence period: dock does not flicker wildly; sticky + fallback behave as expected.
- [ ] **E4.** Refresh / hydration: `RoomMinimizedHydration` + markers still compatible (no double subscribe / no stale dock).

### Phase F — Optional follow-ups

- [x] **F1.** `aria-live="polite"` on dock title (`headerLabel`); full live-region parity optional.
- [ ] **F2.** Evaluate unifying “primary stream” logic between full stage and dock (only if product wants identical focus everywhere).

---

## Known limits (fill in during implementation)

- _Browser background tab behavior: …_
- _Mobile Safari / WebView notes: …_

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-10 | Initial plan from product discussion (dock, dominant, pin, share, silence, tasks). |
| 2026-05-10 | Implemented B1–B4, C1–C2, D1–D3, F1 in client (`use-minimized-dock-main-stage`, `minimized-dock-focus`, `MinimizedRoomDock` updates). Phases A, C3, E: manual QA. |
