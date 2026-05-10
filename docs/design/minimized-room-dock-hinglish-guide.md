# Minimized room dock — poora A–Z (Hinglish)

Yeh document **end-to-end** explain karta hai: minimized / floating call dock ki **saari functionalities**, **flow**, **Redux + RTC**, aur jo **problems** aayi thin unka **fix** — sab **bohot simple** Hindi–English mix mein.

Formal English design: [`minimized-room-dock-plan.md`](minimized-room-dock-plan.md).

---

## A. User ko kya milta hai? (product)

1. Call chal rahi hai **full screen** (`/circle/[roomId]`).
2. User **minimize** kare → app **chhota dock** dikhata hai (jaise PiP), user **home** ya jo **return path** set ho wahan chala jata hai.
3. **Audio + signaling** band **nahi** — same WebRTC / mediasoup session **zinda** rehta hai.
4. Dock pe **main video** (share / pin / dominant), **side strip** (You ya remote thumbnail), **mic / camera / screen**, **timer**, **Skip / End**, **wapas full call** ka button.
5. **Expand** → wapas `/circle/roomId` pe same call, **bina naye join** ke (jab sab theek ho).

---

## B. Architecture — “dimaag mein map”

```
┌─────────────────────────────────────────────────────────┐
│  app/layout.tsx → RtcSocketProvider (hamesha mounted)   │
│    → Socket.IO + useMediasoupRoom + streams             │
└─────────────────────────────────────────────────────────┘
         │ useRtcSocketContext()
         ▼
┌──────────────────────┐     ┌─────────────────────────┐
│  /circle/[roomId]    │     │  /home, /dashboard, …   │
│  RoomPage + full UI  │     │  MinimizedRoomDock      │
└──────────────────────┘     └─────────────────────────┘
         │                              │
         └────────── same Redux ────────┘
              sessionActive, activeRoomId, isMinimized
```

**Important point:** RTC **page pe lock nahi** — **`RtcSocketProvider`** root layout mein hai. Isliye `/home` pe bhi **wahi** `localMediaStream`, `remoteMediaStream`, `mediasoupStatus` milta hai jab tak `sessionActive === true`.

---

## C. Redux mein kya store hota hai? (`room-slice`)

| Field | Matlab |
|--------|--------|
| `ui.sessionActive` | Call “on” hai ya nahi — **true** = RTC chal sakta hai |
| `ui.isMinimized` | Full room chhupa ke **dock mode** |
| `session.activeRoomId` | Kaunsa room id abhi call ka hai |
| `session.rtcPrimaryRemoteUserId` | **Pin** — user ne kisko focus kiya |
| `session.directCallPeerLabel` | 1:1 mein naam fallback |

**Actions jo is feature se related hain:**

- `startVideoSession` — call start, usually `join` ke baad
- `minimizeVideoSession` — sirf `isMinimized = true`
- `expandVideoSession` — `isMinimized = false`
- `endVideoSession` — sab band, `activeRoomId` null
- `enterRoomPage({ roomId })` — sirf `/circle` route sync + phase

---

## D. Minimize flow — step by step

**Code:** `use-room-video.ts` → `handleMinimize`

1. `markRoomMinimized()` → `sessionStorage` mein `ROOM_MINIMIZED_KEY = "1"` (taaki baad mein pata chale call minimized thi).
2. `dispatch(minimizeVideoSession())` → Redux `isMinimized: true`.
3. `router.replace(getRoomReturnPath() ?? "/home")` → user **circle route** chhod deta hai.

**Dhyan:** `sessionActive` **false nahi** hota — isliye mediasoup **band nahi**.

```ts
// use-room-video.ts — idea
const handleMinimize = useCallback(() => {
  markRoomMinimized();
  dispatch(minimizeVideoSession());
  const dest = getRoomReturnPath() ?? "/home";
  router.replace(dest);
}, [dispatch, router]);
```

---

## E. Dock kab dikhta hai? (`MinimizedRoomDock`)

**Conditions (roughly):**

- `selectIsVideoSessionActive` → true  
- `selectIsRoomMinimized` → true  
- `pathname` **`/circle/` se start na ho** — full room URL pe dock **hide** (warna do jagah UI)

Isliye home / baaki pages pe dock float karta hai.

---

## F. Mediasoup kab “enabled” hai? (`rtc-socket-provider.tsx`)

```ts
const mediasoupEnabled =
  sessionActive &&
  Boolean(activeRoomId) &&
  rtcSocketState === "connected";
```

**Matlab:** minimize se `sessionActive` / `activeRoomId` **mat todo** — warna poora join flow dubara chalega. Yahi reason tha jab pehle **galat cleanup** se `resetRoomState` ho jata tha toh user ko “dubara join” dikhta tha.

---

## G. Expand / full call wapas

**Code:** `minimized-room-dock.tsx` → `handleExpand`

1. `dispatch(expandVideoSession())` — Redux mein minimized band.
2. **`clearRoomMinimized()` yahan intentionally nahi** jab `activeRoomId` ho — detail **section R** mein.
3. `router.push(/circle/${activeRoomId})`.

`RoomPage` load → `RoomVideoLayer` → `useRoomVideo` mount → wahan `markRoomActive()`, `clearRoomMinimized()`, `expandVideoSession()` (idempotent safe).

---

## H. Video dock mein — black screen problem & fix

**Problem:** Chhota `<video>` Chrome **throttle** karta hai → **black**.

**Fix:** `minimized-dock-video-sink.tsx` — **off-screen decode sink** (fixed size) + display layer, **same idea** jaise bade `RoomVideoStage` mein `VideoMirror` pattern.

**Functionality:** Dock ko **live** frames milte hain, UI chhoti ho sakti hai.

---

## I. Dock mein “main tile” pe kaun dikhe? (policy)

**Order of precedence** (high → low):

| Priority | Condition | Dikhao |
|----------|-----------|--------|
| 1 | **Screen share** active (`mainStageShowsScreen`) | **Shared screen** — bada area; **ab product choice:** extra “peer camera column” **nahi** (sirf share + You strip) |
| 2 | **Pin** (`rtcPrimaryRemoteUserId`) | Us participant ka video / avatar |
| 3 | **Dominant speaker** (`dominantSpeakerPeerId`) | Jo zyada bol raha (server se mic-based) |
| 4 | **Silence** (`null` dominant) | Thodi der **last dominant sticky**, phir **stable fallback** (e.g. pehla remote) |
| 5 | **Group mein tum hi dominant** | Main pe **tumhara** camera / avatar; side strip pe **doosra remote** |

**Code:**

- `use-minimized-dock-main-stage.ts` — poora map: main stream vs side strip, mirror flags.
- `minimized-dock-focus.ts` — `playbackStreamForDockVideo`, debounce timings, `resolveFocusedRemoteParticipant`.

**Direct (1:1) call:** Composite `remoteMediaStream` use hota hai taaki dock aur bada stage **align** rahein.

---

## I2. Speed / optimization — `useMinimizedDockMainStage` (best simple approach)

**Pehle:** `lastNonNull` + `silenceStartedAt` + `silenceStickyLive` — **teen alag `useState`** + **do effects** + **microtasks** → zyada renders / chain.

**Ab:** **`useReducer` + pure reducer** (`minimized-dock-main-stage-silence.ts`):

- Har `dominantSpeakerPeerId` change pe **ek hi `dispatch`** (`apply_dominant`) — React **ek hi commit** mein teen fields update kar sakta hai (last non-null, silence timestamp, sticky flag).
- **`Date.now()`** sirf **reducer** ke andar — render / `useMemo` pe nahi.
- Sticky end: **`setTimeout` → `sticky_timer_fire`** — alag effect, lekin cheap.
- **Debounce** alag rehta hai (dominant switch jitter kam) — uske liye **`setTimeout`** hi sahi tool hai.

**Guard:** Sticky khatam ho chuka ho (`silenceStickyLive === false` lekin `silenceStartedAt` abhi set hai) toh dubara `apply_dominant(null)` se **sticky re-arm nahi** hota — double microtask / Strict Mode safe.

---

## I3. Code flow snippets — data kidhar ja raha hai?

### 1) Poori app / call lifecycle (high level)

```text
[User full room /circle/roomId]
        │
        │  minimizeVideoSession + markRoomMinimized + router.replace("/home")
        ▼
[Redux: sessionActive=true, isMinimized=true, activeRoomId=roomId]
        │
        │  RtcSocketProvider (layout) — mediasoupEnabled still true if socket connected
        ▼
[Home + MinimizedRoomDock visible]
        │
        │  useRtcSocketContext() → same streams / dominantSpeakerPeerId
        │  useMinimizedDockMainStage(...) → main tile + side strip
        ▼
[User taps "full call" / expand]
        │
        │  expandVideoSession + router.push(/circle/roomId)
        │  clearRoomMinimized only after RoomVideoLayer mounts (see R1)
        ▼
[RoomPage + RoomVideoLayer — same RTC session, no forced re-join]
```

### 2) Server → dock tile (dominant / silence)

```text
rtc-service  dominantSpeaker  event  { peerId } | null
        │
        ▼
client: dominantSpeakerPeerId (RTC context state)
        │
        ▼
useMinimizedDockMainStage
        │
        ├─► useEffect([dominantSpeakerPeerId])
        │         queueMicrotask(() =>
        │           dispatch({ type: "apply_dominant", peerId }))
        │         // reducer: bol raha hai? → lastNonNull update, silence clear
        │         //          chup?      → sticky arm (if koi lastNonNull hai)
        │
        ├─► useEffect([silence.silenceStartedAt])
        │         setTimeout(STICKY_MS) → dispatch({ type: "sticky_timer_fire" })
        │
        ├─► useEffect debounce ([dominantSpeakerPeerId, pinned])
        │         dominant null? → queueMicrotask clear debounced
        │         else            → setTimeout(DEBOUNCE_MS) set debounced
        │
        ├─► useMemo dominantBackedPeerId
        │         pinned? → null
        │         dominant non-null? → debounced ?? live id
        │         silence sticky?    → lastNonNullDominant
        │         else               → null  →  dockFocusPeerId falls back to first remote
        │
        └─► useMemo (final) → MinimizedDockMainStage → MinimizedRoomDock UI
```

### 3) Minimize handler (actual code path)

```ts
// use-room-video.ts — yahan se "door" khulta hai dock ka
markRoomMinimized();                    // sessionStorage flag
dispatch(minimizeVideoSession());     // Redux isMinimized = true
router.replace(getRoomReturnPath() ?? "/home");
// sessionActive TRUE rehta hai — RTC band nahi
```

### 4) Reducer skeleton (pure — test / reason about easy)

```ts
// minimized-dock-main-stage-silence.ts — idea
// apply_dominant peerId truthy → remember speaker, silence reset
// apply_dominant null        → arm sticky once per silence episode
// sticky_timer_fire          → silenceStickyLive = false (fallback tile)
```

---

## J. Server pe “dominant speaker” kya hai?

**File:** `rtc-service/.../dominant-speaker-broadcast.ts`

- Sirf **mic** se — screen-share audio **dominant fight** mein mix nahi.
- `AudioLevelObserver` — sabse zyada awaaz.
- Silence pe `peerId: null` — client ko **random tile** nahi dikhana; **sticky + fallback** use karo.

---

## K. Side strip (“You” column)

- **Normal:** main pe remote focus → strip pe **“You”** + local preview / avatar.
- **Jab main pe tum ho** (self dominant / pin self): strip pe **remote** ka thumbnail + `remotePeer` metadata (avatar, mic off rings).

**UI polish:** `CameraOffAvatar` + `TileSpeakingRings` — full room jaisa feel.

---

## L. Dock controls (functionality list)

- **Mic / Camera / Screen share** — `useRtcSocketContext()` ke `toggleMic`, `toggleCamera`, `toggleScreenShare`; `mediasoupStatus === "ready"` pe hi enable.
- **Timer** — call duration (`use-call-elapsed-seconds`).
- **Expand** — `SquareArrowOutUpRight` (full room se **alag** icon taaki confuse na ho `Maximize2` se).
- **Skip / End** — `useRoomVideo` handlers; End pe Redux + storage clear + matching hub redirect (existing flow).
- **Drag** — `use-minimized-dock-drag` + `sessionStorage` offset.

**HUD minimize (full room):** `PictureInPicture2` — “floating call” metaphor.

---

## M. Screen share layout (dock)

**Pehle:** 3 columns possible the — share + peer camera + You.

**Ab (product):** Sirf **shared screen** + **You** — beech ka remote camera column **hata diya** taaki clean rahe.

Grid roughly:

```tsx
"grid-cols-[minmax(0,1fr)_minmax(4.75rem,26%)] sm:grid-cols-[minmax(0,1fr)_6rem]"
```

---

## N. Accessibility

- Dock title / focus naam pe **`aria-live="polite"`** — screen reader ko pata chale focus change hua.

---

## O. Multi-tab / BroadcastChannel

**`use-room-video.ts`** (full room, `skipSetup: false`):

- `subscribeRoomChannel` — agar doosre tab se END / SKIP aaye toh sync.
- Dock `skipSetup: true` use karta hai sirf **End/Skip** handlers ke liye — taaki **double subscribe** na ho.

---

## P. Refresh ke baad minimized restore

**`RoomMinimizedHydration`** (`room-minimized-hydration.tsx`):

- Agar `sessionStorage` mein **call active** + **minimized** dono markers hain → `startVideoSession` + `minimizeVideoSession` dispatch — taaki refresh ke baad dock wapas aa sake.

---

## Q. Tab lease (duplicate tab)

**`use-room-page-tab-lease.ts`:**

- Same user + same room **do tabs** mein conflict na ho — `localStorage` lease.
- Duplicate → toast + `/home` redirect.

---

## R. Problems jo aayi thin & fixes (sab ek jagah)

### R1. Dock se expand → “reload / dubara join”

**Kyun:**  
- `clearRoomMinimized()` **navigation se pehle** chal jata tha → `isRoomMinimizedMarked()` false → `useRoomPageTabLease` cleanup samajhta “poora room chhod diya” → `resetRoomState()` → RTC wipe.

**Fix:**  
- Circle pe jaate waqt dock se **`clearRoomMinimized()` mat chalao**; `RoomVideoLayer` / `useRoomVideo` pe clear karo.  
- Cleanup ko **`setTimeout(0)`** se defer karo; agar URL ab bhi `/circle/[roomId]` hai to **`resetRoomState` mat** karo (Strict Mode / transient unmount).

```tsx
// minimized-room-dock.tsx — expand (idea)
dispatch(expandVideoSession());
if (activeRoomId) router.push(`/circle/${activeRoomId}`);
else {
  clearRoomMinimized();
  router.push("/home");
}
```

```ts
// use-room-page-tab-lease.ts — deferred cleanup (idea)
pendingLeaveCleanupRef.current = setTimeout(() => {
  const path = window.location.pathname;
  const rid = roomIdRef.current;
  if (path === `/circle/${rid}` || path.startsWith(`/circle/${rid}/`)) return;
  // ... lease + clearRoomStorage + resetRoomState
}, 0);
```

Remount pe pehle wala timeout **cancel** — double reset na ho.

**Minimize pe cleanup:** `isRoomMinimizedMarked()` true → **early return** — Redux / session **mat** todo.

---

### R2. Expand ke baad camera “off” dikhna

**Kyun:** `useMediasoupRoomSession` ka effect **`localDisplayName` / `localProfileImageUrl`** pe depend karta tha — profile hydrate hote hi effect **re-run** → cleanup → UI flags reset → `cameraEnabled` false.

**Fix:** Join payload **refs** se: `localDisplayNameRef`, `localProfileImageUrlRef`; effect deps mein **ye strings mat rakho**.

```ts
// concept
localDisplayNameRef.current = localDisplayName;
// join: displayName: localDisplayNameRef.current ?? undefined
```

---

### R3. Dock video black

**Fix:** Off-screen sink + mirror — section **H**.

---

### R4. Icons same lag rahe the (fullscreen vs dock)

**Fix:** HUD minimize → `PictureInPicture2`; dock expand → `SquareArrowOutUpRight`; stage immersive → `Maximize2` / `Minimize2`.

---

### R5. Screen share pe layout / clutter

**Fix:** Peer camera column hata ke **2 columns** — section **M**.

---

### R6. React: “Cannot access refs during render”

**Kyun:** `roomIdRef.current = roomId` render body mein tha.

**Fix:** `useLayoutEffect` ke andar assign karo — refs **effect** mein update.

```ts
useLayoutEffect(() => {
  roomIdRef.current = roomId;
  userIdRef.current = currentUserId;
  // ...
}, [roomId, sessionPending, currentUserId, dispatch]);
```

---

## S. Important files (quick map)

| Kaam | Path (client) |
|------|----------------|
| Dock UI | `features/room/components/minimized-room-dock.tsx` |
| Video sink | `features/room/components/minimized-dock-video-sink.tsx` |
| Main/side logic | `features/room/hooks/use-minimized-dock-main-stage.ts` |
| Silence + last-dominant reducer (pure) | `features/room/lib/minimized-dock-main-stage-silence.ts` |
| Focus helpers | `features/room/lib/minimized-dock-focus.ts` |
| Minimize / expand storage | `features/room/lib/room-sync.ts` |
| Minimize navigate | `features/room/hooks/use-room-video.ts` |
| Tab lease + deferred reset | `features/room/hooks/use-room-page-tab-lease.ts` |
| Room page gates | `features/room/pages/room-page.tsx` |
| Global RTC | `features/rtc/providers/rtc-socket-provider.tsx` |
| Mediasoup session | `features/rtc/hooks/use-mediasoup-room-session.ts` |
| Dominant (server) | `rtc-service/src/modules/peers/dominant-speaker-broadcast.ts` |

---

## T. Ek line summary

**Dock = same RTC session + Redux “minimized” flag + non-circle route pe UI.**  
**Saari “smart” cheezein = tile policy, sink pattern, storage/cleanup order, mediasoup refs, aur deferred tab lease.**

---

## U. QA checklist (manual — jaldi se)

- [ ] Minimize → home → **audio sunai de**
- [ ] Expand → **bina naye join** full room
- [ ] Pin change → dock focus **match**
- [ ] Zor se bolo → dominant **debounced** switch
- [ ] Chup ho jao → **flicker kam**, sticky theek
- [ ] Screen share → sirf **share + You**
- [ ] End from dock → **sab clear**
- [ ] Do tabs same room → **duplicate** toast
- [ ] Refresh with markers → **hydration** theek

---

*Last updated: minimized dock + `useReducer` silence optimization + flow snippets in I2/I3; storage/lease/mediasoup fixes as before.*
