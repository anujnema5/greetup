# Guest call trial — manual QA checklist

> **Step 33 deliverable.** Run these in a local or staging environment with client + server + matching-service + Redis + Postgres.  
> Architecture reference: [guest-trial-architecture.md](./guest-trial-architecture.md) §17.

**Automated smoke (2026-06-12):** `server` + `client` `tsc --noEmit` pass; `device-fingerprint.test.ts` passes.

| Status | Meaning |
|--------|---------|
| ⬜ | Not run yet |
| ✅ | Passed manual run |
| ❌ | Failed — file bug / note |
| 🔍 | Code-reviewed only (run manually to confirm) |

---

## Environment setup

- [ ] ⬜ Redis up; guest trial keys writable
- [ ] ⬜ Migration `0030_guest_trial.sql` applied
- [ ] ⬜ `GUEST_MATCH_POOL=guest_and_registered` in matching-service (launch default)
- [ ] ⬜ Two browsers or one normal + one incognito for two-user flows
- [ ] ⬜ Optional second registered account for guest↔registered match test

---

## §17 — Core flows

### 1. Happy path (end-to-end)

**ID:** QA-01  
**Status:** 🔍

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open `/` as logged-out visitor | Landing shows **Try one free conversation** → `/try` |
| 2 | Click CTA → `/try` | Guest session created; name step if empty |
| 3 | Enter display name (2+ chars) | Advances to match prefs |
| 4 | Save mood + looking-for + 2–5 interests | Advances to **Find match** |
| 5 | Tap Find match (second browser/user searching) | Proposal dialog → Connect |
| 6 | Land in `/circle/[roomId]`; video connects | Call works |
| 7 | End call | Redirect to `/try/complete` |
| 8 | **Create free account** → `/register?from=guest` | Merge banner; signup completes |
| 9 | Complete shortened `/profile-setup` | Interests step skipped if guest prefs carried over |

**Code refs:** `GuestTrialPage`, `GuestMatchStep`, `proxy.ts`, `upgrade-guest-user-on-signup.service.ts`

---

### 2. Trial blocked on second match attempt

**ID:** QA-02  
**Status:** 🔍

| Step | Action | Expected |
|------|--------|----------|
| 1 | Complete QA-01 through RTC (trial consumed) | `guest_trial_consumed_at` set |
| 2 | Return to `/try` or tap Find match again | Redirect `/try/complete` or `GUEST_TRIAL_EXHAUSTED` → signup gate |

**Code refs:** `assert-guest-call-trial-available`, `get-guest-call-trial-status`, `GuestMatchStep` + `shouldShowGuestSignupGate`

---

### 3. Device hash blocks new guest after consumed

**ID:** QA-03  
**Status:** 🔍

| Step | Action | Expected |
|------|--------|----------|
| 1 | Consume trial on device A (same browser profile) | Success |
| 2 | Clear cookies / sign out; open `/try` again same device | `POST /auth/guest` → `403 GUEST_TRIAL_ALREADY_USED` |
| 3 | UI shows signup CTA, not a new guest session | `guest-trial-page` error card |

**Code refs:** `assertDeviceMayStartGuestCallTrial`, `redisMarkDeviceCallTrialConsumed`, `device-fingerprint.ts`

---

### 4. Skip proposals without consuming trial

**ID:** QA-04  
**Status:** 🔍

| Step | Action | Expected |
|------|--------|----------|
| 1 | Reach **proposed** state; tap **Skip** (do not Connect) | New search; `guest_trial_consumed_at` still null |
| 2 | Repeat until search cap | Trial still not consumed until RTC token |

**Code refs:** `consume-guest-call-trial` only from `issue-rtc-token`; proposal skip in `useFindMatch`

---

### 5. RTC connect consumes trial

**ID:** QA-05  
**Status:** 🔍

| Step | Action | Expected |
|------|--------|----------|
| 1 | Connect on proposal; wait for token issue | `guest:trial_consumed` socket; status `trialConsumed: true` |
| 2 | DB: `user_profiles.guest_trial_consumed_at` set | Redis device key set |

**Code refs:** `issue-rtc-token.service.ts`, `consume-guest-call-trial.service.ts`

---

### 6. Guest cannot access full app routes

**ID:** QA-06  
**Status:** 🔍

| Step | Action | Expected |
|------|--------|----------|
| 1 | As guest, visit `/home`, `/connections`, `/explore`, `/circle/search` | Redirect to `/try` or `/try/complete` |
| 2 | API: `GET /profile` (non-allowed) | `403 GUEST_NOT_ALLOWED` |

**Code refs:** `client/src/proxy.ts`, `block-guest-from-full-app.middleware.ts`

---

### 7. Signup merges name + prefs

**ID:** QA-07  
**Status:** 🔍

| Step | Action | Expected |
|------|--------|----------|
| 1 | After trial, `/register?from=guest` with same cookie | Merge banner `mergeAvailable: true` |
| 2 | Email or Google signup | Same `user_id` upgraded; `is_guest=false`, `guest_converted_at` set |
| 3 | `/profile-setup` | Shortened onboarding; guest display name cleared from username step |

**Code refs:** `guest-signup-merge.plugin.ts`, `upgrade-guest-user-on-signup.service.ts`, `get-converted-guest-onboarding-hints`

---

### 8. Guest matches registered user (launch pool)

**ID:** QA-08  
**Status:** 🔍

| Step | Action | Expected |
|------|--------|----------|
| 1 | Guest + registered user both on Find match | Match proposal succeeds |
| 2 | Both connect | Direct match room; registered user unaffected long-term |

**Env:** `GUEST_MATCH_POOL=guest_and_registered`

---

### 9. `guest_only` pool isolation (post-launch toggle)

**ID:** QA-09  
**Status:** ⬜ (config change test)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Set `GUEST_MATCH_POOL=guest_only`; restart matching-service | — |
| 2 | Guest + registered both searching | No cross-type pairing |

---

### 10. Two tabs — consume in one blocks the other on new match

**ID:** QA-10  
**Status:** 🔍

| Step | Action | Expected |
|------|--------|----------|
| 1 | Same guest session in two tabs | Shared cookie |
| 2 | Tab A: connect and consume trial | Success |
| 3 | Tab B: try new find or RTC on different room | `403` trial exhausted / signup gate |

---

### 11. Rejoin same room after brief disconnect

**ID:** QA-11  
**Status:** 🔍

| Step | Action | Expected |
|------|--------|----------|
| 1 | Mid-call: refresh or brief network drop | Rejoin same `roomId` allowed |
| 2 | Second RTC token same room | Idempotent consume; no double-charge |

**Code refs:** `consume-guest-call-trial` idempotent branch when already consumed

---

### 12. `no_match` allows retry

**ID:** QA-12  
**Status:** 🔍

| Step | Action | Expected |
|------|--------|----------|
| 1 | Search with empty pool | Error message; retry button |
| 2 | Trial not consumed | `canStartMatch` still true (until 5 searches) |

---

### 13. 6th search hits cap

**ID:** QA-13  
**Status:** 🔍

| Step | Action | Expected |
|------|--------|----------|
| 1 | Trigger `POST /matching/find` 5 times (guest session) | 5th allowed |
| 2 | 6th attempt | `403 GUEST_SEARCH_RETRY_EXHAUSTED` or UI search limit card |

**Code refs:** `GUEST_MATCH_SEARCH_RETRY_LIMIT = 5`, `guest-match-search-retry.service.ts`

---

## Edge cases (spot-check)

| ID | Case | Expected | Status |
|----|------|----------|--------|
| QA-A4 | Full user opens `/try` | Redirect `/home` | 🔍 |
| QA-A5 | Guest `/register` without `from=guest` | Warning banner | 🔍 |
| QA-B1 | Empty name submit | Validation error | 🔍 |
| QA-E2 | Guest opens circle lobby URL | Blocked / redirect | 🔍 |
| QA-E6 | Post-call Find match | Signup gate | 🔍 |
| QA-F1 | Skip all proposals, never connect | Trial not consumed | 🔍 |

---

## Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| QA | | | |
| Product | | | |

When all **QA-01–QA-13** are ✅, proceed to **Step 34** (archive architecture doc to `docs/design/`).
