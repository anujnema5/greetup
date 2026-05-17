# Room / Circle — Call kab start, kab band? (Hinglish guide)

> **Visual version:** [room-session-lifecycle-hinglish.html](./room-session-lifecycle-hinglish.html) — timeline, priority ladder, dark UI (browser me kholo).

Yeh document **sari conditions ek jagah** rakhta hai: direct call, instant circle, scheduled circle, direct → circle upgrade, host actions, aur time limits.

**Teen hisse:**

1. **Aaj code me kya hai** — abhi live behaviour  
2. **Target rules (implement karna hai)** — product jo agree hua  
3. **Join-time reconciliation** — stale DB fix jab koi join kare  

---

## Pehle 4 words samjho

| Word | Matlab |
|------|--------|
| **Lobby** | Room me ho, preview / wait — **video call abhi nahi** (scheduled se pehle) |
| **Live session** | Asli call chal rahi — RTC / video-voice |
| **Booking (calendar)** | Circle banate waqt likha: **8 PM start, 10 PM tak** (scheduled) |
| **Per session** | Ek baar live start → usi continuous call ki limit (2h / 3h) |

---

## Room ke types

| Type | Example |
|------|---------|
| **Direct (1:1)** | Match ya friend call, 2 log |
| **Instant circle** | "Start circle" abhi, koi fixed 8 PM slot nahi |
| **Scheduled circle** | 8 PM meeting book ki |
| **Direct → circle** | 1:1 chal raha tha, "Add to circle" se group ban gaya |

---

# PART A — Aaj code me kya hai (abhi)

## A1. Scheduled circle — 2 ghante **join grace** (koi live hi nahi hua)

- Constant: `SCHEDULED_JOIN_GRACE_AFTER_START_MINUTES = 120` (2 hours)  
- **Kab:** Circle abhi bhi `scheduled` hai, `scheduled_start_at` (jaise 8 PM) **nikal chuka**, lekin kabhi **live** nahi hui  
- **Kya hota hai:** System circle ko **expired** mark kar sakta hai — matlab "8 PM ke 2 ghante baad bhi koi meeting start nahi hui"  
- **Yeh alag hai:** "Room khali hai 2 ghante" se — yeh rule **"meeting start hi nahi hui"** wale case ke liye hai  

## A2. `expires_at` + `is_expired` (circles)

- DB me `expires_at` — kab circle **join / use** ke liye band ho jaye (listing, token)  
- Scheduled banate waqt: `scheduled_end_at` ya `scheduled_start + circleExpirationMinutes` se banta hai  
- **Direct call:** aksar `expires_at = null` — koi auto time limit nahi  
- Past `expires_at` → `is_expired = true` (sync on list / join / token) — **lekin har baar sabko call se nikalta nahi**  

## A3. Sab last ho gaye + `deleteCircleAfterCall`

- Advanced option ON ho to: **last active participant** leave kare → circle **turant ended**  
- OFF ho to: log chale jayein par circle DB me **live** reh sakti hai (dubara join possible)  

## A4. Host — **"End call for everyone"**

| Circle type | Host click ke baad |
|-------------|-------------------|
| **Instant** (calendar slot nahi) | Call **poori tarah khatam** — `ended`, sab disconnect, SFU teardown |
| **Scheduled** (8 PM slot hai) | Live call **band** — often wapas `scheduled` + host row reactivate (slot **delete nahi**) — dubara 8 PM window me start ho sakta hai |

**Instant circle:** Host end = **call khatam honi chahiye** — yeh aaj **host-end-circle** se hota hai (instant = ended).

## A5. Host — participant **Remove** (kick)

- User call se nikalta hai (`left_at`)  
- Optional **restrict** → dubara join nahi kar sakta jab tak restriction hataye  
- Invite cancel (recent fix) — dubara invite bhej sakte ho  

## A6. User khud **Leave** call

- `left_at` set  
- Agar koi aur active nahi + `deleteCircleAfterCall` → circle end (A3)  
- Warna circle live reh sakti hai  

## A7. Redis `ROOM_TTL = 2 hours`

- Sirf `room:{id}` Redis key ki expiry refresh  
- **Matlab:** DB call end rule **nahi** — technical cache  

## A8. Direct match end

- Match khatam → `finalizeDirectMatchRoomSession` — direct room **ended**  

---

# PART B — Target rules (implement karna hai)

Yeh woh policy hai jo product + engineering agree kare — **ek saath sab conditions**.

## B0. Golden rules (yaad rakhne layak)

1. **Per session threshold** — har **live session** ki apni max duration  
2. **Booking window** — scheduled circle ka apna start/end (8–10 PM)  
3. **Host end for everyone** — hamesha **us session ko abhi band** karo (instant = poora end)  
4. **Khali room / grace** — scheduled slot me koi active nahi → alag timer (2h wala logic)  
5. **Naya session** — sab chale gaye, dubara live start → **naya per-session timer** (lekin booking ke bahar mat jao)  

---

## B1. Per session time limits (naya — core)

| Room | Ek live session max |
|------|---------------------|
| **Direct 1:1** | **2 ghante** — `live_started_at + 2h` |
| **Circle** (instant ya scheduled live) | **3 ghante** — `live_started_at + 3h` |

**Live session kab start?**

- Pehli baar room `live` + RTC actually chalu  
- Store: `live_started_at` (abhi `started_at` use ho sakta hai)  

**Session kab khatam (timer reset)?**

- Sab active participants call chhod chuke (sabka `left_at` set) **ya** host **End for everyone**  
- Uske baad dubara join + live = **naya session**, **naya 2h/3h**  

**6:01 wala sawal (dubara start):**

- Haan — **naya session = naya 3 ghante**  
- **Lekin** scheduled circle me **booking end (10 PM) ke baad** dubara live **allowed nahi**  
- Aur **recommended:** scheduled slot se **pehle** dubara full live mat kholo (sirf lobby) — taaki 3 PM + 6 PM game na ho  

---

## B2. Scheduled circle — booking (calendar)

Jab circle **scheduled** banayi:

| Field | Example |
|-------|---------|
| `scheduled_start_at` | 8:00 PM |
| `scheduled_end_at` ya duration | 10:00 PM (2h slot) |

**Call band kab (calendar ceiling):**

- Live call **10 PM ke baad nahi** chalegi (strict calendar end)  
- Chahe per-session 3h bachi ho — **10 PM hard stop**  

**8 PM se pehle jaldi live (host Start early):**

- **Per-session:** 3 PM start → 6 PM = 3h cap (session ke andar)  
- **Calendar floor:** end time kam se kam **10 PM** tak allow (6 PM pe poori meeting mat kaat do sirf isliye ki jaldi start ho gaya)  
- **Simple formula (scheduled):**  
  `session_end = live_started_at + 3h`  
  `calendar_end = scheduled_end (ya start + expiration minutes)`  
  `expires_at = min(session_end, calendar_end)` jab session calendar ke **andar** hai  
  Agar `session_end` calendar se **pehle** hai aur tum **6 PM pe band** karna chahte ho — woh **session cap** hai; 8 PM ke baad **naya session** allowed ho sakta hai (product choice — neeche B5)  

---

## B3. Scheduled — 2 ghante, **koi user nahi** (tumhara purana logic)

**Intent:** Scheduled slot aa gaya, room **live** hai ya open hai, par **koi active participant nahi** — 2 ghante baad room band / expire.

| Detail | Rule |
|--------|------|
| Trigger | `scheduled_start_at` ke baad, active participant count = 0 |
| Timer | **2 ghante** khali rehti hai |
| Action | Circle end ya expire — Redis + DB, dubara join band (ya sirf scheduled listing se hatao) |
| Koi aa gaya | Timer **reset** / cancel — `refreshLiveCircleExpiryAfterParticipantJoin` jaisa idea |

**Note:** Aaj **2h join grace** sirf "kabhi live nahi hui" scheduled row ke liye hai (Part A1). **Khali live room 2h** alag rule hai — **implement karna baaki** (controller comment me likha hai, leave-circle me poora nahi).

---

## B4. Instant circle

| Cheez | Rule |
|-------|------|
| Booking | Nahi — sirf **live start + 3h** per session |
| Host **End for everyone** | **Turant poora end** — `ended`, sab disconnect, SFU teardown (**must work hamesha**) |
| Last person leave + `deleteCircleAfterCall` | Turant end (aaj bhi) |
| Per session | 3 ghante, phir auto-end + notify |

---

## B5. Direct 1:1

| Cheez | Rule |
|-------|------|
| Per session | **2 ghante** live |
| Upgrade to circle | `expires_at` / session cap **update** — circle wale 3h rules (B1 + B2 agar scheduled nahi) |
| Match end | Pehle se `finalizeDirect` |

---

## B6. Direct → circle upgrade

| Cheez | Rule |
|-------|------|
| Type change | `direct` → `circle`, seats badho |
| Time | `expires_at = max(purani expires_at, ab + 3h)` (instant upgrade) |
| Scheduled nahi | Booking rules apply nahi — sirf per-session 3h |

---

## B7. Host **"End call for everyone"** (confirm — must)

| Type | Hona chahiye |
|------|----------------|
| **Instant circle** | **Abhi, poora band** — koi rejoin same live session me nahi |
| **Scheduled circle** | Live **abhi band** — sab disconnect; slot calendar me reh sakta hai (wapas scheduled) ya product ke hisaab se ended |
| **Direct** | Dono ko disconnect + room end (agar direct ke liye host end hai) |

Yeh **per-session timer se upar** — host button = manual **immediate end**.

---

## B8. Auto-end jab time khatam (implement)

Jab `now >= expires_at` (ya session cap):

1. DB: participants `left_at`, status `ended` (ya scheduled revert — type ke hisaab se)  
2. SFU teardown  
3. Redis session delete  
4. Socket: "Call time limit reached" / host ended jaisa message  

Optional baad me: **15 min / 5 min warning**.

---

# Ek table — "Call kab band hogi?" (priority order)

Upar wala rule **pehle** check hota hai (jyada important):

| # | Condition | Kya hoga |
|---|-----------|----------|
| 1 | Host **End for everyone** | **Turant band** (instant = poora end) |
| 2 | Host **Remove + restrict** | User nikal + dubara join nahi |
| 3 | **Per session** time khatam (2h direct / 3h circle) | Auto-end **us session** |
| 4 | **Scheduled calendar end** (10 PM) | Auto-end — iske **baad** live nahi |
| 5 | Scheduled **khali 2h** (koi active nahi) | Room end / expire |
| 6 | Scheduled **join grace 2h** — kabhi live nahi hui | Circle expired (listing) |
| 7 | `deleteCircleAfterCall` + last banda gaya | Circle end |
| 8 | `expires_at` past (sync) | Join/token band; auto-end jodna hai (B8) |
| 9 | Kick (no restrict) | Sirf user nikalta hai; baaki chalu |

---

# Examples (short)

### Instant circle, host ne 5 PM start, 5:30 End for everyone

→ **5:30 pe sab band** (Rule 1). 3h timer matter nahi.

### Instant circle, 5 PM start, koi end nahi

→ **8 PM** tak max (5 PM + 3h), phir auto-end (Rule 3).

### Scheduled 8–10 PM, 3 PM pe live (early), sab 6 PM chale gaye

→ Session 1: **6 PM** pe session cap se band ho sakti hai (3h)  
→ **8 PM** pe **naya session**? — **Product:** haan allowed (naya 3h, lekin **10 PM** se pehle band — Rules 4 + 3)  
→ **6:01 dubara start** same session me? — **Nahi** agar sab left_at; **naya session** = naya timer  

### Scheduled 8 PM, kabhi live nahi, 10 PM ho gaya

→ **Join grace / expired** (Rule 6) — "meeting start nahi hui"  

### Scheduled live, sab chale gaye 9 PM, 2h khali

→ **11 PM** tak empty grace? — Rule 5: 2h khali → end (implement detail: clock start = jab last ne leave kiya)

---

# DB fields (reference)

| Column | Use |
|--------|-----|
| `scheduled_start_at` | Booking start |
| `scheduled_end_at` | Booking end (optional) |
| `started_at` | Kab room live hui (session anchor) |
| `expires_at` | Enforced deadline (session + calendar mix) |
| `ended_at` | Kab band hui |
| `is_expired` | Listing / join block |
| `advanced_options.deleteCircleAfterCall` | Last leave → end |
| `advanced_options.circleExpirationMinutes` | Scheduled listing window helper |

---

# PART C — Join-time reconciliation (stale DB fix)

Kabhi-kabhi call **band honi chahiye thi** par DB me abhi bhi `status = live`, `is_expired = false`, ya `expires_at` update nahi hua (crash, missed webhook, purana code, Redis TTL sirf cache hataya).  
**Koi dubara join kare** → us waqt **pehle verify + repair**, phir join allow ya reject.

Yeh **cron ka wait nahi** — user jab bhi room touch kare (join / token / GET room), tab **turant sahi state**.

---

## C0. Problem (simple)

| DB me dikhta hai | Reality |
|------------------|---------|
| `live` | Koi 2+ ghante se call me nahi / time khatam ho chuka |
| `is_expired = false` | `expires_at` past hai |
| `expires_at = null` | Direct/circle 3h cap cross ho chuka |
| Redis session gayab | DB abhi bhi live |

**Risk:** Naya user join kare → purani “zombie” call me aa jaye.  
**Fix:** Join se **pehle** ek shared function: *“kya abhi bhi yeh call valid hai?”* — nahi → **end karo**, phir join block.

---

## C1. Kab chalana hai (entry points)

Sab jagah **same function** — duplicate logic mat likho.

| Entry point | Kab |
|-------------|-----|
| `POST /room/:id/join` | **Pehla step** — participant row se pehle |
| `POST /room/:id/rtc-token` | Token se pehle |
| `GET /room/:id` (circle metadata) | Load se pehle |
| List active circles (optional bulk) | Pehle se `syncPastDue` hai — reconcile end bhi jodna |

**Order inside handler:**

```text
1. reconcileRoomSessionOnAccess(roomId)  → maybe ends room, returns { closed, reason }
2. reload room row
3. if closed → 410 ROOM_EXPIRED / 400 ROOM_NOT_LIVE (message me reason)
4. normal join / token / lobby logic
```

---

## C2. `reconcileRoomSessionOnAccess` — kya check kare (priority)

Upar wala rule pehle (Part B priority table jaisa). Agar **koi bhi** “ab band hona chahiye” → **ek hi end path** chalao, reason log karo.

| # | Check | Matlab | Action |
|---|--------|--------|--------|
| R1 | `expires_at` past **ya** `is_expired` true | Deadline / flag miss sync | **End session** + ensure `is_expired`, `ended_at` |
| R2 | Scheduled, kabhi `live` nahi, `scheduled_start + 2h` grace past | Join grace (A1) | **Expire** row (scheduled listing se hatao) |
| R3 | `status = live` + **per-session cap** past | `started_at + 2h` (direct) / `+ 3h` (circle) | **End session** |
| R4 | Scheduled + **calendar end** past | 10 PM booking khatam | **End session** |
| R5 | `status = live` + **0 active participants** + khali **≥ 2h** | Koi call me nahi 2+ ghante | **End session** (tumhara case) |
| R6 | Direct match / ended elsewhere | Already should be ended | **End session** (idempotent) |

**“Active participant”** = `room_participants.left_at IS NULL`.

**Khali 2h (R5) detail:**

- `last_departure_at` = sab active rows ke `left_at` ka max; agar koi active hai → R5 skip  
- Agar active = 0 aur `last_departure_at` (ya `started_at` agar koi kabhi join nahi) se ab **≥ 2 hours** → end  
- Scheduled: sirf `scheduled_start_at` ke **baad** apply (pehle lobby empty = alag policy)

**Per-session (R3):** `now > session_deadline` jahan `session_deadline = started_at + cap` (scheduled me `min` with calendar — Part B formula).

---

## C3. “End” ka matlab (repair = poora band)

Sirf `is_expired = true` **kaafi nahi** jab tak call live dikhe. Reconcile end = **same as B8 auto-end**:

1. `room_participants`: sab active → `left_at = now`  
2. `rooms`: `status = ended` (instant/direct) **ya** scheduled revert policy (host-end jaisa)  
3. `ended_at`, `expires_at = now`, `is_expired = true`  
4. `deleteSessionRoomRedis(roomId)`  
5. `clearUserActiveRtcRoom` for affected user ids (batch)  
6. `notifyRtcServiceSfuRoomTeardown(roomId)` — agar SFU me koi reh gaya ho  
7. Optional socket: `circle:session_closed` reason `reconciled_on_join`  

**Idempotent:** Dobara call karo → already ended → no-op, `{ closed: true, alreadyWasClosed: true }`.

---

## C4. Join flow diagram

```text
User → POST /join
         │
         ▼
    reconcileRoomSessionOnAccess(roomId)
         │
         ├─ should end? ──YES──► endLiveSession(reason)
         │                              │
         │                              ▼
         └─ reload room ◄──────────────┘
                 │
         isDbRoomSessionClosed?
                 │
        YES ─────┴───── NO
         │              │
         ▼              ▼
   410 ROOM_EXPIRED   lobby / live join
   (Hinglish msg)     (existing logic)
```

**User message examples (Hinglish):**

- `ROOM_EXPIRED` + `reason=empty_room_2h`: “Yeh circle band ho chuki hai — 2 ghante se koi call me nahi tha.”  
- `reason=session_time_cap`: “Call ki time limit khatam ho chuki hai.”  
- `reason=calendar_end`: “Scheduled meeting ka time khatam ho gaya hai.”

---

## C5. Kya verify karna hai (checklist per join)

DB se ek baar load:

- [ ] `rooms`: `status`, `room_type`, `started_at`, `scheduled_start_at`, `scheduled_end_at`, `expires_at`, `is_expired`, `advanced_options`  
- [ ] Active participant count + `max(left_at)` for empty-room rule  
- [ ] Optional: Redis `room:{id}` exists? (mismatch → treat as stale live)

Phir C2 table top-to-bottom. **Pehla match** → end + stop checks.

Join **tab allow** jab:

- Room `live` (ya scheduled lobby path) **aur** `!isDbRoomSessionClosed(room)` **aur** user allowed (invite/participant/restrict).

---

## C6. Code plan (files)

| Piece | Location / name |
|-------|------------------|
| Constants | `server/.../constants/room-session-limits.ts` — 2h, 3h, empty 2h |
| Expiry compute | extend `room-expiry.ts` — `computeSessionDeadline(room)` |
| **Reconcile service** | `reconcile-room-session-on-access.service.ts` |
| **End executor** | `end-live-room-session.service.ts` (shared: reconcile, auto-end cron, host-end overlap) |
| Wire join | `join-room.service.ts` — line 37 ke baad pehle reconcile |
| Wire token | `issue-rtc-token.service.ts` — circle + **direct** dono |
| Wire GET room | `room.controller.ts` GET handler |
| Tests | reconcile: expired past; empty 2h; session 3h; idempotent double join |

---

## C7. Edge cases

| Case | Behaviour |
|------|-----------|
| Host join kare, sab aur log 2h pehle gaye | R5 → end **before** host re-join → host ko expired (ya naya session start flow alag se) |
| `live` + 1 active, cap past | R3 → end + kick via teardown |
| Scheduled `scheduled`, lobby row only | R5 mat chalao jab tak `live` nahi; R2 grace alag |
| Reconcile + user restricted | End pehle; phir bhi join block `RESTRICTED` |
| Race: do log ek saath join | DB transaction / row lock on `rooms.id` reconcile |

---

## C8. Logging & ops

Har reconcile end:

```text
logger.info("room_session_reconciled", { roomId, reason, previousStatus, activeCount })
```

Reason codes: `expires_at_past`, `join_grace_missed`, `session_cap`, `calendar_end`, `empty_room_2h`, `already_closed`.

---

# Implementation checklist (dev)

- [ ] Constants: `DIRECT_SESSION_MAX_MS`, `CIRCLE_SESSION_MAX_MS`, `SCHEDULED_EMPTY_ROOM_GRACE_MS`  
- [ ] `computeSessionExpiresAt(room)` — per type + scheduled calendar cap  
- [ ] Set `expires_at` on: direct create, mark live, expand direct→circle  
- [ ] **Empty room 2h** on scheduled live (timer reset on join)  
- [ ] **Auto-end** job / sync: past `expires_at` → teardown (not only `is_expired`)  
- [ ] Direct rooms: `isDbRoomSessionClosed` on RTC token  
- [ ] Host end instant: verify always `ended` + teardown  
- [ ] Client warnings (optional)  
- [ ] **`reconcileRoomSessionOnAccess`** — join + token + GET (Part C)  
- [ ] **`endLiveRoomSession`** shared executor — idempotent full teardown  
- [ ] **R5 empty 2h** — `last left_at` / no active participants  
- [ ] Join error messages — reason-specific Hinglish/English copy  

---

*Last updated: product discussion — per-session 2h/3h, scheduled calendar, host end, empty grace, restart session, **join-time reconcile**.*
