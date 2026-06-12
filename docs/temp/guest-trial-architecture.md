# Guest Call Trial — Architecture & Implementation Plan

> **Status:** Planning document (temporary). Follow step-by-step; say **"do next"** to implement the next unchecked step.
>
> **Last updated:** 2026-06-12
>
> **Goal:** Give visitors **one free video call** — that is the entire trial. Matching, name, and prefs exist only to **get them into that single call**. After the call trial is used, they **must sign up** for another call.
>
> **Scope reminder:** This is **not** a free tier, not unlimited matching, not circles/chat/explore. **One call. Then signup.**

---

## Table of contents

1. [Product definition](#1-product-definition)
2. [High-level architecture](#2-high-level-architecture)
3. [Data model](#3-data-model)
4. [Auth & session](#4-auth--session)
5. [Guest mini-onboarding (name + prefs)](#5-guest-mini-onboarding-name--prefs)
6. [Matching & snapshot](#6-matching--snapshot)
7. [Room & RTC flow](#7-room--rtc-flow)
8. [Client routes & UX](#8-client-routes--ux)
9. [Signup conversion & account linking](#9-signup-conversion--account-linking)
10. [Abuse prevention](#10-abuse-prevention)
11. [Feature matrix](#11-feature-matrix)
12. [API contracts](#12-api-contracts)
13. [Error codes](#13-error-codes)
14. [Implementation steps (checklist)](#14-implementation-steps-checklist)
15. [Edge cases catalog](#15-edge-cases-catalog)
16. [Files reference map](#16-files-reference-map)
17. [Testing checklist](#17-testing-checklist)
18. [Open product decisions](#18-open-product-decisions)
19. [Module architecture (mandatory)](#19-module-architecture-mandatory)

---

## 1. Product definition

### 1.1 The trial = one call only

| What “trial” means | What it does **not** mean |
|--------------------|---------------------------|
| **One** direct video call (WebRTC) | Free account / free tier |
| Name + match prefs only to **reach** that call | Unlimited searches forever |
| Signup required for **any second call** | Access to circles, chat, connections, explore |

Supporting steps (not separate trials):

- **Display name** — so the peer sees who they’re talking to
- **Match prefs** — mood, looking-for, interests — so the one call isn’t random noise
- **Find match** — plumbing to pair two guests for that single call

### 1.2 When is the **call trial** consumed?

**Rule:** Trial is consumed when the guest **successfully receives an RTC token** for a **direct match room** (`sessionKind = "match"`). That is the start of their **one allowed call**.

Rationale: server-authoritative via `issueRtcTokenService`; hard to spoof.

**Does NOT consume the call trial:**

- Guest session created
- Name / prefs saved
- Match search, proposal, skip-before-connect
- `no_match` or cancel before connect

**DOES consume the call trial:**

- First successful `POST /rooms/:roomId/rtc-token` for a direct match room as a guest

### 1.3 After the call trial is used

- Block any **new** call: match find, connect, join, rtc-token
- Allow: signup/login, post-call screen, rejoin **same** room if briefly disconnected
- Signup does **not** reset the call trial on the same device

---

## 2. High-level architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Landing "/"  ──CTA──►  /try  (guest flow shell)                        │
└─────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────┐     POST /api/auth/guest      ┌──────────────────┐
│  Guest session      │ ◄──────────────────────────── │  Better Auth +   │
│  (HTTP-only cookie) │                               │  guest plugin    │
└─────────┬───────────┘                               └──────────────────┘
          │
          ▼
┌─────────────────────┐     PATCH /guest/profile      ┌──────────────────┐
│  Step 1: Name       │ ─────────────────────────────►│  users.display   │
└─────────┬───────────┘                               │  Name            │
          │                                           └──────────────────┘
          ▼
┌─────────────────────┐     POST /guest/match-prep    ┌──────────────────┐
│  Step 2: Match prep │ ─────────────────────────────►│  current_status, │
│  (mood/LF/interests)│                               │  profile_interests│
└─────────┬───────────┘                               │  + Redis snapshot │
          │                                           └──────────────────┘
          ▼
┌─────────────────────┐     POST /matching/find         ┌──────────────────┐
│  Match search       │ ─────────────────────────────►│  matching-service│
│  (guest pool policy)│ ◄── socket: match:* ──────── │  (guest filter)  │
└─────────┬───────────┘                               └──────────────────┘
          │
          ▼
┌─────────────────────┐     GET /circle/[roomId]      ┌──────────────────┐
│  Video call         │ ── rtc-token (CONSUMES) ────►│  rtc-service     │
└─────────┬───────────┘                               └──────────────────┘
          │
          ▼
┌─────────────────────┐     /register?from=guest      ┌──────────────────┐
│  Signup required    │ ── merge guest account ────►│  Full user       │
└─────────────────────┘                               └──────────────────┘
```

### Design principles

1. **Guest = real `userId`** — reuse matching, rooms, RTC, sockets; no parallel anonymous API.
2. **Server enforces trial** — client UI is convenience only.
3. **Minimal guest surface** — narrow routes and APIs; everything else 403.
4. **Configurable guest match pool** — launch with guests + registered users; tighten to guest-only later (§6.1).
5. **Upgrade in place** — signup links credentials to existing guest row; don't create a second user.

---

## 3. Data model

### 3.1 Schema changes

#### `user_profiles` (new columns)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `is_guest` | `boolean` | `false` | `true` until converted |
| `guest_trial_consumed_at` | `timestamptz` | `null` | Set on RTC token issue |
| `guest_converted_at` | `timestamptz` | `null` | Set on successful signup merge |
| `guest_device_hash` | `text` | `null` | SHA-256 of client fingerprint payload |
| `guest_created_ip_hash` | `text` | `null` | Hashed IP at guest creation |

#### `guest_trial_events` (new table — audit + abuse)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `guest_user_id` | `text` FK → `users.id` | |
| `event_type` | `text` | See §3.2 |
| `device_hash` | `text` | nullable |
| `ip_hash` | `text` | nullable |
| `metadata` | `jsonb` | roomId, requestId, etc. |
| `created_at` | `timestamptz` | |

#### `users` — guest placeholder constraints

Existing schema requires `email` (NOT NULL, UNIQUE) and `username` (NOT NULL, UNIQUE).

**Guest insert strategy:**

```
email     = guest+{userId}@guest.greetup.invalid   (non-deliverable domain)
username  = guest_{first8OfUserId}                 (unique)
name      = displayName || "Guest"
displayName = user-provided (Step 1)
emailVerified = false
```

No `account` row until signup. Session row created by Better Auth guest plugin.

### 3.2 Event types (`guest_trial_events.event_type`)

| Event | When |
|-------|------|
| `guest_session_created` | `POST /auth/guest` succeeds |
| `guest_profile_saved` | Name saved |
| `guest_match_prep_saved` | Prefs saved + snapshot refreshed |
| `guest_match_started` | `POST /matching/find` |
| `guest_match_proposed` | Engine returns `proposed` |
| `guest_call_trial_consumed` | Call trial used (RTC token issued) |
| `guest_signup_started` | Register page with guest cookie |
| `guest_converted` | Guest merged to full account |
| `guest_blocked_abuse` | Device/IP limit hit |

### 3.3 Redis keys (abuse)

| Key | TTL | Purpose |
|-----|-----|---------|
| `guest:device:{hash}:consumed` | 90 days | Block new guest if device already consumed |
| `guest:ip:{hash}:count:{date}` | 24h | Rate limit guest creations per IP |

### 3.4 Snapshot shape (guest)

Reuse existing `user:profile:snapshot:{userId}` pipeline via `refreshProfileSnapshotFromDatabase`.

Add to snapshot `attributes` (matching-service already reads arbitrary attributes):

```json
{
  "isGuest": true,
  "sessionMoodIds": ["..."],
  "sessionLookingForIds": ["..."],
  "connectionPreference": "random"
}
```

Guest snapshots omit goals, profession, location (or use safe defaults: `distancePreference: "global"`).

---

## 4. Auth & session

### 4.1 New endpoint: `POST /api/auth/guest`

**Location:** `server/src/core/auth/plugins/guest-session.plugin.ts` (new), registered in `auth.ts`.

**Behavior:**

1. Check device hash + IP limits (§10).
2. If `guest:device:{hash}:consumed` exists → `403 GUEST_TRIAL_ALREADY_USED`.
3. Create `users` + `user_profiles` rows (`is_guest=true`).
4. Create Better Auth session (short TTL: **24 hours**).
5. Set session cookie (same as normal auth).
6. Log `guest_session_created` event.
7. Return `{ userId, isGuest: true, trialConsumed: false }`.

**Request body (optional):**

```json
{
  "deviceFingerprint": "string-from-client"
}
```

### 4.2 Guest session middleware

**New:** `guestAwareMiddleware` — runs after `authMiddleware`, sets:

```ts
c.set("isGuest", boolean)
c.set("guestTrialConsumed", boolean)
```

**New:** `requireGuestTrialAvailable` — throws `GuestTrialExhaustedError` if `isGuest && guestTrialConsumed`.

Apply to:

- `POST /matching/find`
- `POST /matching/respond` (only `connect`)
- `POST /rooms/:roomId/join`
- `POST /rooms/:roomId/rtc-token`

### 4.3 Guest-only route guard

**New:** `blockGuestFromFullApp` — if `isGuest`, return 403 on:

- `/connections/*`, `/chat/*`, `/explore/*`, circle create, profile edit (except guest endpoints), etc.

### 4.4 Session expiry

- Guest sessions expire in 24h (configurable).
- Expired guest with unused trial: may create new guest **unless** device hash shows consumed.
- Expired guest with consumed trial: must signup.

---

## 5. Guest mini-onboarding (name + prefs)

### 5.1 Step 1 — Display name

**UI:** `GuestNameStep` on `/try`

**API:** `PATCH /api/guest/profile`

```json
{ "displayName": "Alex" }
```

**Validation:**

- Required for v1 (no skip).
- Length: 2–30 characters.
- Allowed: letters, numbers, spaces, basic punctuation.
- Reject: URLs, emails, excessive symbols.
- Profanity filter (reuse or stub same rules as profile).

**Storage:** `users.displayName` + `users.name` (keep in sync for Better Auth).

**Lock:** After `guest_match_started`, name is read-only until signup.

### 5.2 Step 2 — Match preferences

**UI:** `GuestMatchPrepDialog` — fork of `MatchPrepDialog` with:

- Mood (required, 1+)
- Looking for (required, 1+)
- Interests (required, 2–5)
- **No** distance/location controls in v1 (default `random` / `global`)

**API:** `POST /api/guest/match-prep`

Reuse logic from `saveMatchPrepService` but:

- Skip `clientSessionId` tab tracking (guest has one flow).
- Force `connectionPreference: "random"`.
- Call `refreshProfileSnapshotFromDatabase(userId)` after save.
- Log `guest_match_prep_saved`.

**Options API:** Reuse `GET /profile/match-prep/options` (no auth change needed if already public — verify; else allow guests).

### 5.3 Guest status endpoint

**API:** `GET /api/guest/status`

```json
{
  "isGuest": true,
  "displayName": "Alex",
  "hasMatchPrep": true,
  "trialConsumed": false,
  "canStartMatch": true,
  "nextStep": "match" | "name" | "prefs" | "signup"
}
```

---

## 6. Matching & snapshot

### 6.1 Guest match pool policy (configurable)

**Problem:** With few users at launch, guest-only pairing means two guests must be online at once → many `no_match` results.

**Solution:** A single server/matching-service config controls who guests can pair with. Flip to stricter mode when traffic grows — no code rewrite.

#### Policy values

| Policy | Env (planned) | Guest requester can match | Registered requester can match |
|--------|---------------|---------------------------|--------------------------------|
| **`guest_and_registered`** | `GUEST_MATCH_POOL=guest_and_registered` | Guests **or** registered users | Registered **or** guests |
| **`guest_only`** | `GUEST_MATCH_POOL=guest_only` | Guests **only** | Registered **only** (guests excluded) |

**Launch default (now):** `guest_and_registered` — guests can get a real call with anyone searching on the platform.

**Later (when volume supports it):** `guest_only` — isolate guests from registered users for safety/privacy.

#### Implementation (Steps 13–14)

1. Snapshot `attributes.isGuest: true | false` on every profile (guest + registered).
2. `matching-service` reads `GUEST_MATCH_POOL` (or internal config from server webhook/env).
3. In `orchestrator.ts` candidate filter:

```ts
// guest_and_registered (launch)
if (requester.isGuest) {
  // candidates: guests OR registered (no extra filter)
} else {
  // candidates: anyone (guests included)
}

// guest_only (future)
if (requester.isGuest) {
  // candidates: isGuest === true only
} else {
  // candidates: isGuest !== true
}
```

4. **Safety assert** in dev/staging: log critical if policy is `guest_only` but pairing violates rule.

#### Registered-user UX (launch mode)

- Registered users may be matched with a guest (one-time trial caller).
- Peer preview shows guest `displayName` only (no guest badge required for v1).
- Optional later: host opt-out “don’t match trial guests” when `guest_only` is not enough.

### 6.2 Pre-match validation (server)

Before `findMatchService`:

1. `is_guest` and `!guest_trial_consumed_at`
2. `displayName` present
3. Match prep complete (mood + lookingFor + interests)
4. Redis snapshot exists (call `ensureProfileSnapshotCached`)

### 6.3 Skip behavior for guests

| Action | Trial impact |
|--------|----------------|
| Skip proposal (before connect) | Does not consume trial; may search again **within same session** until connect |
| Skip after already consumed | N/A — blocked |
| Partner skips | Guest may rematch **only if trial not yet consumed** |

**v1 recommendation:** Allow unlimited proposal skips until first RTC connect. Only **one RTC session** ever.

### 6.4 `no_match` handling

Show friendly message; guest may retry search (trial not consumed). Cap retries: **5 per session** (abuse); after that suggest signup.

---

## 7. Room & RTC flow

### 7.1 Allowed room types for guests

| Room type | Allowed |
|-----------|---------|
| `direct` + `sessionKind = "match"` | Yes |
| `direct` + `connection_call` | No |
| `circle` | No |

Enforce in `joinRoomService` and `issueRtcTokenService`.

### 7.2 Trial consumption hook

In `issueRtcTokenService`, after all access checks pass:

```ts
if (profile.isGuest && !profile.guestTrialConsumedAt) {
  await guestTrialService.consumeTrial(userId, { roomId, ip, deviceHash });
}
```

`consumeTrial`:

1. Set `guest_trial_consumed_at = now()` (idempotent).
2. Set Redis `guest:device:{hash}:consumed`.
3. Log `guest_call_trial_consumed`.
4. Emit socket event `guest:trial_consumed` (optional, for client UI).

### 7.3 Guest call limits (v1)

| Limit | Value |
|-------|-------|
| Max call duration | 10 minutes (server-side room session cap for guest rooms) |
| Screen share | Off |
| Add to circle | Off |
| In-call chat | Off or read-only system messages (product choice — default **Off**) |
| Skip (in call) | Allowed once; ends call; no rematch if trial consumed mid-call |

### 7.4 Post-call flow

On call end (`leaveRoom` / session finalize):

- If guest + trial consumed → redirect to `/try/complete` or show `GuestSignupGate` modal.
- CTA: "Create free account" → `/register?from=guest`

---

## 8. Client routes & UX

### 8.1 New routes

| Route | Purpose | Auth |
|-------|---------|------|
| `/try` | Guest flow shell (name → prefs → match) | Guest or redirect to create guest |
| `/try/complete` | Post-trial signup CTA | Guest with consumed trial |
| `/register?from=guest` | Signup with merge | Anyone |

### 8.2 `proxy.ts` changes

**New `GUEST_ROUTES`:**

```ts
const GUEST_ROUTES = ["/try"];
```

**Logic additions:**

| Condition | Action |
|-----------|--------|
| Not logged in + visits `/try` | Allow (page creates guest session client-side) |
| Logged in full user + visits `/try` | Redirect `/home` |
| Guest + visits `/home`, `/connections`, etc. | Redirect `/try` |
| Guest + trial consumed + visits `/try` (not complete) | Redirect `/try/complete` |
| Guest + visits `/circle/[roomId]` for match room | Allow |
| Not logged in + visits `/circle/[roomId]` | Redirect `/try` or `/login` |

**Landing CTA:** Add "Try one free conversation" → `/try`.

### 8.3 Guest flow UI states (`/try`)

```
loading → creating session
  → name (if missing)
  → prefs (if missing)
  → ready (Find match button)
  → searching (reuse match UI)
  → proposed (MatchFoundDialog)
  → matched (navigate /circle/[roomId])
  → complete (signup gate)
```

### 8.4 Components to add

| Component | Based on |
|-----------|----------|
| `GuestTrialPage` | New shell |
| `GuestNameStep` | New |
| `GuestMatchPrepDialog` | `MatchPrepDialog` |
| `GuestSignupGate` | New modal / full page |
| `useGuestStatus` | React Query hook |
| `useCreateGuestSession` | Mutation |

### 8.5 Socket

Guest uses same `SocketProvider` + session cookie. No separate namespace.

Handle `guest:trial_consumed` to update local state.

---

## 9. Signup conversion & account linking

### 9.1 Flow

1. Guest has session cookie on `/register?from=guest`.
2. User completes email / Google / phone signup.
3. Server detects existing guest session → **upgrade** instead of new user:

```
users.email / phone / account rows → updated
user_profiles.is_guest → false
user_profiles.guest_converted_at → now()
guest_trial_consumed_at → unchanged (still used)
```

4. Redirect to **shortened** `/profile-setup` (skip mood/interests if already saved).

### 9.2 Conflict cases

| Case | Resolution |
|------|------------|
| Guest signs up with email already taken | Show error; offer login + merge policy (v2) |
| Guest signs up on new device | No guest cookie → normal signup; device trial still blocked |
| Guest clears cookies mid-flow | New guest session unless device hash blocked |
| Google account already exists | Login flow; guest data discarded (log event) |

### 9.3 What carries over

| Field | Carry over |
|-------|------------|
| displayName | Yes |
| mood / lookingFor / interests | Yes |
| goals, profession, location | No — collected in shortened onboarding |
| Trial eligibility | No — `guest_trial_consumed_at` preserved |

---

## 10. Abuse prevention

### 10.1 Device fingerprint

**Client:** generate on `/try` mount (e.g. FingerprintJS or lightweight hash of UA + screen + timezone + random local id).

Send on: guest create, trial consume.

**Server:** SHA-256 hash; never store raw fingerprint.

### 10.2 Limits (v1 defaults)

| Limit | Value |
|-------|-------|
| Trials per device | 1 (ever, 90-day Redis key) |
| Guest sessions per IP per day | 3 |
| Match searches per guest session | 5 |
| Proposal skips per session | Unlimited (until connect) |
| Guest session TTL | 24 hours |

### 10.3 Block response

`403 GUEST_TRIAL_ALREADY_USED` with message: "You've already used your free try. Sign up to continue."

---

## 11. Feature matrix

| Feature | Guest (before trial) | Guest (after trial) | Registered |
|---------|---------------------|---------------------|------------|
| Set display name | Yes | Read-only | Yes |
| Set match prefs | Yes | Read-only | Yes |
| Find match | Yes | No | Yes |
| Video call | Yes (once) | No | Yes |
| Skip proposal | Yes | No | Yes |
| Messages | No | No | Yes |
| Connections | No | No | Yes |
| Circles | No | No | Yes |
| Explore | No | No | Yes |
| Profile page | No | No | Yes |
| Welcome tour | No | No | Yes |

---

## 12. API contracts

### `POST /api/auth/guest`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "userId": "...",
    "isGuest": true,
    "trialConsumed": false
  }
}
```

### `GET /api/guest/status`

See §5.3.

### `PATCH /api/guest/profile`

**Body:** `{ "displayName": "Alex" }`

### `POST /api/guest/match-prep`

Same body shape as `MatchPrepSaveBody` (moodIds, lookingForIds, interestIds).

### Existing endpoints (guest restrictions)

| Endpoint | Guest allowed |
|----------|---------------|
| `POST /matching/find` | Yes, if trial available |
| `POST /matching/cancel` | Yes |
| `POST /matching/respond` | Yes (skip/connect) |
| `POST /matching/leave-room` | Yes |
| `GET /matching/peer-preview/:id` | Yes |
| `POST /rooms/:id/join` | Yes (direct match only) |
| `POST /rooms/:id/rtc-token` | Yes once |
| `GET /profile/match-prep/options` | Yes |
| All chat/connections/circles | No |

---

## 13. Error codes

| Code | HTTP | When |
|------|------|------|
| `GUEST_TRIAL_EXHAUSTED` | 403 | Trial consumed; match/RTC blocked |
| `GUEST_TRIAL_ALREADY_USED` | 403 | Device already consumed trial |
| `GUEST_RATE_LIMITED` | 429 | IP guest creation limit |
| `GUEST_PROFILE_INCOMPLETE` | 400 | Missing name or prefs |
| `GUEST_NOT_ALLOWED` | 403 | Feature blocked for guests |
| `GUEST_SESSION_REQUIRED` | 401 | `/try` API without session |

Client maps `GUEST_TRIAL_EXHAUSTED` → `GuestSignupGate`.

---

## 14. Implementation steps (checklist)

> Say **"do next"** to implement the next `- [ ]` step in order.

### Phase 0 — Docs & decisions

- [x] **Step 0:** Write this architecture document

### Phase 1 — Database & types

- [x] **Step 1:** Add migration — `user_profiles` guest columns + `guest_trial_events` table (`0030_guest_trial.sql`)
- [x] **Step 2:** Update Drizzle schema + export types (`user_profiles` guest fields + `guest-trial.ts`)
- [x] **Step 3:** Add `guestTrialRepository` + `guestTrialService` (consume, status, events)

### Phase 2 — Auth

- [x] **Step 4:** Implement `guest-session.plugin.ts` + register in `auth.ts`
- [x] **Step 5:** Guest user factory (placeholder email/username, profile row)
- [x] **Step 6:** Device/IP rate limit checks in guest create
- [x] **Step 7:** Extend `authMiddleware` context with `isGuest`, `guestTrialConsumed`

### Phase 3 — Guest profile APIs

- [x] **Step 8:** `GET /guest/status` controller + route
- [ ] **Step 9:** `PATCH /guest/profile` (display name validation)
- [x] **Step 10:** `POST /guest/match-prep` (reuse save logic + snapshot refresh)
- [x] **Step 11:** `requireGuestCallTrialAvailable` + `blockGuestFromFullApp` middleware

### Phase 4 — Matching

- [x] **Step 12:** Pre-match validation in `handleFindMatch`
- [x] **Step 13:** Matching-service guest pool filter (`orchestrator.ts`) — respect `GUEST_MATCH_POOL` (default `guest_and_registered`)
- [x] **Step 14:** Add `isGuest` to snapshot attributes + wire `GUEST_MATCH_POOL` config (server + matching-service)
- [x] **Step 15:** Guest search retry cap (5) in server or engine

### Phase 5 — Rooms & RTC

- [x] **Step 16:** Block guests from circle / connection_call in join + rtc-token
- [x] **Step 17:** Trial consumption in `issueRtcTokenService`
- [x] **Step 18:** Optional: 10-minute guest room session cap
- [x] **Step 19:** Socket event `guest:trial_consumed`

### Phase 6 — Signup merge

- [x] **Step 20:** Detect guest session on register (email + Google + phone)
- [x] **Step 21:** Upgrade guest user in place; set `guest_converted_at`
- [x] **Step 22:** Shortened onboarding — skip match prep if already complete

### Phase 7 — Client

- [x] **Step 23:** `proxy.ts` guest route rules
- [x] **Step 24:** `/try` page + `GuestTrialPage` shell
- [x] **Step 25:** `GuestNameStep` + `useGuestStatus` + `useCreateGuestSession`
- [x] **Step 26:** `GuestMatchPrepDialog`
- [x] **Step 27:** Wire match flow on `/try` (reuse `MatchmakingProvider` / `useFindMatch`)
- [x] **Step 28:** `GuestSignupGate` + `/try/complete`
- [x] **Step 29:** Landing CTA → `/try`
- [x] **Step 30:** Register page `from=guest` merge UX

### Phase 8 — Polish & QA

- [x] **Step 31:** Error code handling in client API layer
- [x] **Step 32:** Device fingerprint util (client)
- [x] **Step 33:** Manual QA per §17 ([checklist](./guest-trial-qa-checklist.md) — sign off manually)
- [ ] **Step 34:** Remove or archive this doc to `docs/design/` when shipped

---

## 15. Edge cases catalog

### 15.1 Session & auth

| # | Edge case | Expected behavior |
|---|-----------|-------------------|
| A1 | User opens `/try` without cookie | Auto `POST /auth/guest` |
| A2 | Guest session expires mid-match | Socket reconnect with same cookie if valid; else redirect `/try` → new guest blocked if device consumed |
| A3 | Guest opens `/login` | Normal login; guest session replaced on success |
| A4 | Logged-in user opens `/try` | Redirect `/home` |
| A5 | Guest opens `/register` without `from=guest` | Normal register; warn guest data may not merge |
| A6 | Multiple tabs, same guest | Shared session cookie; both can match — first RTC consume wins; second tab gets 403 on token |
| A7 | Guest refreshes during video call | Rejoin same room if session active and trial already consumed (allow rejoin **same room only**) |
| A8 | Better Auth session valid but `is_guest` false | Treat as full user |

### 15.2 Name & profile

| # | Edge case | Expected behavior |
|---|-----------|-------------------|
| B1 | Empty display name | Block match; show validation |
| B2 | Profanity in name | Reject with message |
| B3 | Emoji-only name | Allow if 2+ graphemes (product choice) |
| B4 | Change name after match started | Reject `PATCH` |
| B5 | Unicode / RTL names | Allow; sanitize for XSS in UI |

### 15.3 Match prep

| # | Edge case | Expected behavior |
|---|-----------|-------------------|
| C1 | Only 1 interest selected | Reject; require 2–5 |
| C2 | Prefs saved but snapshot missing | `ensureProfileSnapshotCached` before find |
| C3 | Guest edits prefs after search starts | Block |
| C4 | Lookup IDs invalid | 400 validation error |

### 15.4 Matching

| # | Edge case | Expected behavior |
|---|-----------|-------------------|
| D1 | No other guests online | `no_match`; allow retry (up to cap) |
| D2 | Guest matches guest | Normal flow (all policies) |
| D2b | Guest matches registered (launch policy) | Allowed when `GUEST_MATCH_POOL=guest_and_registered` |
| D3 | Guest matched registered when `guest_only` | Engine must never pair — safety assert + log |
| D4 | Double `POST /matching/find` | Idempotent (existing behavior) |
| D5 | Proposal expires / partner disconnects | Reset to idle; trial not consumed |
| D6 | Both guests accept connect | Navigate to room; first rtc-token consumes for each user independently (**each guest has their own trial**) |
| D7 | 6th search in session | `429` or soft block → signup CTA |

### 15.5 Room & RTC

| # | Edge case | Expected behavior |
|---|-----------|-------------------|
| E1 | Guest requests rtc-token twice same room | Second call idempotent; trial already consumed |
| E2 | Guest tries join circle URL | 403 `GUEST_NOT_ALLOWED` |
| E3 | Room expired before token | 410; trial not consumed if token never issued |
| E4 | Guest disconnects 10s into call | Trial already consumed; show signup |
| E5 | Guest rejoins same room after brief disconnect | Allow rejoin (same `roomId`, same user) |
| E6 | Guest tries new match after call | 403 `GUEST_TRIAL_EXHAUSTED` |
| E7 | RTC token issued but WebRTC fails client-side | Trial still consumed (acceptable for v1) |
| E8 | Peer is registered (bug) | Should not happen; log critical |

### 15.6 Trial consumption timing

| # | Edge case | Expected behavior |
|---|-----------|-------------------|
| F1 | User skips all proposals, never connects | Trial never consumed; can keep trying until search cap |
| F2 | Token issued, user closes tab immediately | Consumed; device blocked |
| F3 | Race: two tabs issue token | DB idempotent update; both get token for same room ok |

### 15.7 Signup & conversion

| # | Edge case | Expected behavior |
|---|-----------|-------------------|
| G1 | Signup after trial | Merge; redirect shortened onboarding |
| G2 | Signup before trial used | Merge; still guest trial available until consumed |
| G3 | Email already exists | Error; suggest login |
| G4 | User logs into existing account from guest | Guest session abandoned; guest row orphaned (cleanup job later) |
| G5 | Signup on second device | New account; first device trial still consumed on device hash |

### 15.8 Abuse

| # | Edge case | Expected behavior |
|---|-----------|-------------------|
| H1 | Clear cookies, new guest | Blocked if device hash consumed |
| H2 | Incognito new fingerprint | May get second trial (acceptable residual risk for v1) |
| H3 | VPN rotates IP | IP limit only; device hash is primary |
| H4 | Bot spam guest create | IP rate limit + CAPTCHA on `/try` (v2) |
| H5 | Scripted rtc-token without call | Still consumes (acceptable) |

### 15.9 Proxy & routing

| # | Edge case | Expected behavior |
|---|-----------|-------------------|
| I1 | Deep link `/circle/[roomId]` as anonymous | Redirect `/try` |
| I2 | Guest deep link after trial | `/try/complete` |
| I3 | API routes bypass proxy | Server middleware still enforces |

### 15.10 Registered user impact

| # | Edge case | Expected behavior |
|---|-----------|-------------------|
| J1 | Registered matched with guest | **Allowed** at launch (`guest_and_registered`); **blocked** when `guest_only` |
| J2 | Guest sees peer preview | Show guest display name only |
| J3 | Guest reported/blocked | v2: report flow; v1: end call + log |

---

## 16. Files reference map

### Server — `modules/guest/` (see `README.md`)

| File | Purpose |
|------|---------|
| `index.ts` | **Public API** — other modules import only from here |
| `README.md` | Module layout + integration rules |
| `router.ts` | `/guest/*` Hono routes |
| `controllers/` | HTTP handlers |
| `repositories/guest-profile.repository.ts` | Profile + trial flags |
| `repositories/guest-trial-events.repository.ts` | Audit log inserts |
| `services/trial/consume-guest-call-trial.service.ts` | Call trial consume |
| `services/trial/assert-guest-call-trial-available.service.ts` | Block second call |
| `services/status/get-guest-call-trial-status.service.ts` | Flow status |
| `services/audit/log-guest-trial-event.service.ts` | Event log |
| `services/abuse/guest-trial-abuse.service.ts` | Device/IP limits |
| `services/session/` | Guest user factory + signup merge (later) |
| `lib/guest-trial-redis.ts` | Redis abuse keys |
| `lib/guest-trial-hash.ts` | SHA-256 helpers |
| `schemas/` | Zod validation |
| `middleware/` | Guest guards (in module or `@/middleware` re-export) |

### Server — auth plugin (calls guest module)

| File | Purpose |
|------|---------|
| `server/src/core/auth/plugins/guest-session.plugin.ts` | Create guest + session |

### Server — modify

| File | Change |
|------|--------|
| `server/src/core/auth/auth.ts` | Register guest plugin |
| `server/src/core/database/schema/users.ts` | Guest columns on `user_profiles` |
| `server/src/core/database/schema/guest-trial.ts` | `guest_trial_events` table |
| `server/src/core/database/migration/0030_guest_trial.sql` | Migration |
| `server/src/middleware/auth.middleware.ts` | `isGuest` context |
| `server/src/modules/router.ts` | Mount `guestRoute` at `/guest` |
| `server/src/modules/matching/controllers/matchmaking.controller.ts` | Pre-validation |
| `server/src/modules/rooms/services/access/issue-rtc-token.service.ts` | Consume trial |
| `server/src/modules/rooms/services/access/join-room.service.ts` | Guest room type guard |
| `server/src/modules/profile/services/match-prep.service.ts` | Extract shared save helper |
| `server/src/modules/user/services/profile-snapshot-cache.service.ts` | Guest snapshot attrs |

### Matching-service — modify

| File | Change |
|------|--------|
| `matching-service/src/modules/simple-matching/orchestrator.ts` | Guest pool filter |
| `matching-service/src/modules/simple-matching/repositories/snapshot.ts` | Parse `isGuest` attribute |

### Client — new files

| File | Purpose |
|------|---------|
| `client/src/app/try/page.tsx` | Route |
| `client/src/app/try/complete/page.tsx` | Post-trial |
| `client/src/features/guest-trial/pages/guest-trial-page.tsx` | Shell |
| `client/src/features/guest-trial/components/guest-name-step.tsx` | Name UI |
| `client/src/features/guest-trial/components/guest-match-prep-dialog.tsx` | Prefs UI |
| `client/src/features/guest-trial/components/guest-signup-gate.tsx` | Signup CTA |
| `client/src/features/guest-trial/api/guest.api.ts` | API calls |
| `client/src/features/guest-trial/hooks/use-guest-status.ts` | Status hook |
| `client/src/lib/device-fingerprint.ts` | Fingerprint hash |

### Client — modify

| File | Change |
|------|--------|
| `client/src/proxy.ts` | Guest routes |
| `client/src/app/landing/page.tsx` or landing CTA | "Try once" button |
| `client/src/app/(auth)/register/page.tsx` | `from=guest` handling |
| `client/src/lib/api/endpoints.ts` | Guest endpoints |
| `client/src/features/matching/hooks/useFindMatch.ts` | Map `GUEST_TRIAL_EXHAUSTED` |

---

## 17. Testing checklist

**Runnable playbook:** [guest-trial-qa-checklist.md](./guest-trial-qa-checklist.md) (Step 33 — manual sign-off).

### Manual

- [ ] New visitor: landing → try → name → prefs → match → video → signup
- [ ] Trial blocked on second match attempt
- [ ] Device hash blocks new guest after consumed
- [ ] Skip proposals without consuming trial
- [ ] RTC connect consumes trial
- [ ] Guest cannot access `/home`, `/connections`, circles
- [ ] Signup merges name + prefs
- [ ] Launch: guest can match registered user when both searching
- [ ] After switching to `guest_only`: registered never paired with guest
- [ ] Two tabs: consume in one blocks the other on new match
- [ ] Rejoin same room after brief disconnect works
- [ ] `no_match` allows retry
- [ ] 6th search hits cap

### Automated (optional later)

- Unit: `guestTrialService.consumeTrial` idempotency
- Unit: guest pool filter in orchestrator
- Integration: `POST /auth/guest` → find → rtc-token → 403 on second find

---

## 18. Open product decisions

Record decisions here before implementing affected steps.

| # | Question | Options | Decision |
|---|----------|---------|----------|
| P1 | Consume trial on RTC token or after N seconds in call? | Token / 60s in call | **Token (v1)** |
| P2 | In-call chat for guests? | Off / On | **Off (v1)** |
| P3 | Max call duration for guests? | 5 / 10 / none | **10 min** |
| P4 | Name required or skippable? | Required / Optional | **Required** |
| P5 | CAPTCHA on guest create? | v1 / v2 | **v2** |
| P6 | Guest search retry cap? | 3 / 5 / unlimited | **5** |
| P7 | Allow rejoin same room after consume? | Yes / No | **Yes** |
| P8 | Guest match pool at launch? | `guest_only` / `guest_and_registered` | **`guest_and_registered`** (switch to `guest_only` when traffic allows) |

---

## 19. Module architecture (mandatory)

Guest call trial is a **standalone feature module**. Do not scatter guest logic across matching, rooms, or profile.

### Server (`server/src/modules/guest/`)

| Rule | Detail |
|------|--------|
| **Public API** | `import { consumeGuestCallTrial } from "@/modules/guest"` only |
| **No cross-imports into guest internals** | Matching/rooms call `index.ts` exports, not `repositories/` |
| **One service per file** | `consume-guest-call-trial.service.ts`, not a god-object |
| **Redis in `lib/`** | `guest-trial-redis.ts` — repositories stay Postgres-only |
| **Auth plugin is thin** | `guest-session.plugin.ts` delegates to `modules/guest` services |
| **Router mounted once** | `router.route("/guest", guestRoute)` in `modules/router.ts` |

### Client (`client/src/features/guest-trial/`)

| Folder | Purpose |
|--------|---------|
| `api/` | `guest.api.ts`, mutations/queries |
| `hooks/` | `use-guest-status`, `use-create-guest-session` |
| `components/` | Name step, match prep, signup gate |
| `pages/` | `GuestTrialPage` shell |
| `types/` | API response types |
| `lib/` | Device fingerprint (client-only) |

App routes (`app/try/`) are thin wrappers that render feature pages — same pattern as `features/room` + `app/circle/[roomId]`.

### Cross-module integration pattern

```ts
// ✅ rooms/issue-rtc-token.service.ts
import { consumeGuestCallTrial } from "@/modules/guest";

// ❌ never
import { guestProfileRepository } from "@/modules/guest/repositories/guest-profile.repository";
```

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-12 | Initial architecture document |
| 2026-06-12 | Module layout: split services, `index.ts` public API, `README.md` |
| 2026-06-12 | Guest match pool: launch `guest_and_registered`, future `guest_only` via `GUEST_MATCH_POOL` |
