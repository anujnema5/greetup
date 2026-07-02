# Session activities & match modes — design spec

**Status:** Draft for implementation approval  
**Last updated:** 2026-06-28  
**Related:** [matching-system-design.md](./matching-system-design.md), [room-activities-and-chess.md](./room-activities-and-chess.md), [open-to-connect.md](./open-to-connect.md)

This document defines **session activities** (what users want to *do together*) and **two match intents** (Quick match vs Activity match). It is written to minimize regressions in the existing match-prep, matching-engine, and space-creation flows.

---

## 1. Goals

| Goal | Description |
|------|-------------|
| **G1** | Let users express concrete session intent (chess, language practice, vent, study, etc.) |
| **G2** | Offer two match entry points: broad (Quick) vs activity-focused (Activity) |
| **G3** | Reuse the same activity catalog in **match prep** and **space creation** |
| **G4** | Extend matching/scoring without breaking users who never pick activities |
| **G5** | Keep in-room chess (realtime game) separate from session-activity matching |

---

## 2. Terminology (do not confuse)

| Term | User-facing label | Code / DB | Meaning |
|------|-------------------|-----------|---------|
| **Session activity** | “What do you want to do?” | `activities`, `current_status_activities` | Catalog item + optional detail for *this session* |
| **Match intent** | “Quick match” / “Match by activity” | `matchIntent: quick \| activity` | How aggressively to filter/score on activities |
| **Interest** | “Your interests” | `interests`, `profile_interests` | Profile-level hobbies (unchanged) |
| **Looking for** | “Looking for” | `looking_for_options` | Conversation *style* (unchanged in v1) |
| **Mood** | “Mood right now” | `moods` | Emotional state (unchanged) |
| **Space category** | “Category” | `room_categories` | Community identity (founders, engineers, …) |
| **Room type** | *(internal)* | `roomType: direct \| space` | 1:1 vs group room — **not** activities |
| **In-room activity** | “Activities” panel in call | `room:chess:*`, Redux `roomActivity` | Runtime chess/game inside a room — **different feature** |

> **Naming rule:** In code and docs, say **session activity** when talking about match/space tagging. Say **in-room activity** only for chess/runtime room features ([room-activities-and-chess.md](./room-activities-and-chess.md)).

---

## 3. Product summary

### 3.1 Two match intents (one flow, two choices)

User picks intent **before** match prep (or as first step inside prep):

| Intent | UI label | Activities | Primary matching |
|--------|----------|------------|------------------|
| `quick` | **Quick match** / “Find anyone” | Optional (0–3) | Existing signals: moods, looking for, interests, location, age, gender, connection preference |
| `activity` | **Activity match** / “Match by activity” | **Required** (1–3) | Same-activity overlap first; detail match bonus when both sides provide detail |

**Default intent:** `quick`.

### 3.2 Spaces

- Host may tag **1–5 session activities** when creating a space (optional in v1 UI, recommended).
- Space **category** and **activities** are independent (category = community; activities = what happens in the session).
- No separate “space mode” — only match has Quick vs Activity.

---

## 4. Activity catalog (v1 seed)

Each row in `activities` table:

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | PK |
| `name` | varchar, unique | Stable slug (see table below) |
| `display_name` | varchar | Chip label |
| `description` | text | Short helper text |
| `emoji` | varchar | Optional |
| `detail_mode` | enum | `none` \| `language` \| `topic` \| `optional_topic` |
| `detail_label` | varchar | Shown when detail input visible |
| `detail_max_length` | int | Default **80** |
| `sort_order` | int | UI order |
| `is_active` | boolean | Inactive = not pickable, still readable for historical rows |

### 4.1 Seed rows

| slug | display_name | emoji | detail_mode | detail_label | detail required |
|------|--------------|-------|-------------|--------------|-----------------|
| `play_chess` | Play chess | ♟️ | `none` | — | — |
| `language_practice` | Language practice | 🗣️ | `language` | Which language? | **Yes** |
| `startup_ideas` | Startup & business ideas | 🚀 | `none` | — | — |
| `vent` | Vent | 💨 | `topic` | What's on your mind? | **Yes** |
| `yap` | Yap | 🗯️ | `topic` | What do you want to yap about? | **Yes** |
| `media_chat` | Movies, sports & books | 🎬 | `topic` | What do you want to talk about? | **Yes** |
| `topic_discuss` | Discuss a topic | 💡 | `topic` | Topic | **Yes** |
| `truth_or_dare` | Truth or Dare | 🎲 | `optional_topic` | Session title (optional) | No |
| `study_together` | Study together | 📚 | `optional_topic` | Subject or focus (optional) | No |

### 4.2 Detail validation rules

- Trim whitespace; reject empty when required.
- Max length per activity (`detail_max_length`, default 80).
- Store **normalized detail** for matching: `trim().toLowerCase()` in a separate column or at compare time only (display keeps original trim).
- No HTML; plain text only.
- `language` mode: v1 free text (“Spanish”, “Hindi”); v2 may add ISO picker without breaking stored text.

---

## 5. Data model

### 5.1 New tables

```sql
-- Catalog (seeded, upsert by name like goals/moods)
activities (...)

-- Session selections (mirrors current_status_moods pattern)
current_status_activities (
  id uuid PK,
  current_status_id uuid FK → current_status ON DELETE CASCADE,
  activity_id uuid FK → activities ON DELETE RESTRICT,
  detail text NULL,
  detail_normalized text NULL,  -- optional generated/stored for matching
  created_at timestamp,
  UNIQUE (current_status_id, activity_id)
)

-- Space tagging
room_activities (
  id uuid PK,
  room_id uuid FK → rooms ON DELETE CASCADE,
  activity_id uuid FK → activities ON DELETE RESTRICT,
  detail text NULL,
  detail_normalized text NULL,
  created_at timestamp,
  UNIQUE (room_id, activity_id)
)
```

### 5.2 Extend `current_status`

Add column:

```sql
match_intent match_intent_enum NOT NULL DEFAULT 'quick'
-- enum values: 'quick', 'activity'
```

Persisted on every match-prep save so snapshot + matching engine know the user’s last intent.

### 5.3 Selection payload shape (API)

```typescript
type ActivitySelection = {
  activityId: string; // uuid
  detail?: string | null;
};

type MatchPrepSaveBody = {
  matchIntent: "quick" | "activity";
  activitySelections?: ActivitySelection[]; // max 3
  // ... existing moodIds, lookingForIds, interestIds, etc.
};
```

**Limits:**

| Context | Min activities | Max activities |
|---------|----------------|----------------|
| Match prep — `quick` | 0 | 3 |
| Match prep — `activity` | 1 | 3 |
| Space create | 0 (v1) | 5 |

---

## 6. User flows

### 6.1 Match entry (dashboard)

```
[ Find a match ]
     ↓
Choose intent:  [ Quick match ]  [ Activity match ]
     ↓
Match prep dialog (existing) + new Activities section
     ↓
Save & find match  |  Skip (quick only — see §8.3)
```

**Activity section UX:**

1. Show activity chips from catalog (active only).
2. On select → if `detail_mode !== none`, show inline input with `detail_label`.
3. On deselect → clear detail for that activity.
4. Validate before save (see §7).

### 6.2 Match prep — existing fields unchanged

Still required for **both** intents (preserve current behavior):

- ≥1 mood  
- ≥1 looking for  
- ≥1 interest  
- Location rules unchanged when `locationPreferenceEnabled`  

Additional rules per intent (§7).

### 6.3 Space create

Add optional multi-select **Activities** block in start-space modal:

- Same catalog + detail inputs.
- Title remains separate; **optional** auto-suggest from first activity detail (user can override).
- Persist via `room_activities` on create; return in space read APIs.

### 6.4 After match — in-room chess

If matched users both had `play_chess` in session activities, in-room chess invite still uses existing [room-activities-and-chess.md](./room-activities-and-chess.md) flow. **No automatic chess start** in v1 — session activity is intent only.

---

## 7. Validation matrix

| Rule | quick | activity | Server | Client |
|------|-------|----------|--------|--------|
| `matchIntent` required | ✓ | ✓ | ✓ | ✓ |
| `activitySelections` max 3 | ✓ | ✓ | ✓ | ✓ |
| At least 1 activity | optional | **required** | ✓ | ✓ |
| No duplicate `activityId` | ✓ | ✓ | ✓ | ✓ |
| Activity exists & `is_active` | if any sent | ✓ | ✓ | ✓ |
| Required detail present | per row | per row | ✓ | ✓ |
| Detail length ≤ max | per row | per row | ✓ | ✓ |
| Moods / looking for / interests | existing rules | existing rules | ✓ | ✓ |

**Error codes (suggested):**

- `ACTIVITY_REQUIRED` — activity intent but empty selections  
- `ACTIVITY_INVALID` — unknown or inactive id  
- `ACTIVITY_DETAIL_REQUIRED` — missing required detail  
- `ACTIVITY_DETAIL_TOO_LONG` — over max length  
- `ACTIVITY_DUPLICATE` — duplicate activityId in payload  

---

## 8. Matching engine behavior

### 8.1 Snapshot extension

Extend `user:profile:snapshot:{userId}` JSON (via `findProfileSnapshotForCache`) with:

```json
{
  "currentStatus": {
    "matchIntent": "quick",
    "activities": [
      { "id": "<activity-uuid>", "name": "language_practice", "detail": "Spanish", "detailNormalized": "spanish" }
    ],
    "moods": [...],
    "lookingFor": [...]
  }
}
```

**Backward compatibility:** Parser treats missing `activities` as `[]` and missing `matchIntent` as `quick`.

Extend `SnapshotUserProfile.attributes`:

- `matchIntent: "quick" | "activity"`
- `sessionActivityIds: string[]`
- `sessionActivities: { activityId: string; name: string; detailNormalized: string | null }[]`

### 8.2 Scoring weights (v1 proposal)

Add to `MATCH_SCORE_CONFIG.weights`:

| Key | Weight | When applied |
|-----|--------|--------------|
| `sessionActivities` | **20** | Requester has ≥1 activity (either intent) |
| `sessionActivityDetail` | **+8 bonus** | Same slug **and** same normalized detail (both non-empty) |

Keep existing weights unchanged. Apply activity weights using same pattern as `activeMatchPrepWeights` — **zero weight if requester has no activities**.

**Overlap logic:**

- Compare by activity **slug** (`name`) or id — prefer id in storage, slug in logs.
- Multiple activities: use **best pairwise overlap** (max Jaccard on activity id sets, same as interests).
- Detail bonus: only when both users share at least one activity id **and** normalized details match for that row.

### 8.3 Activity intent — search phases

Reuse existing `isFallbackMatch` flag when widening.

| Phase | Timeout | Candidate pool | Notes |
|-------|---------|----------------|-------|
| **A — Strict** | 0–45s | Both users `matchIntent === activity` AND ≥1 shared activity id | Hard filter before score; if none, stay in searching |
| **B — Widen activity** | 45–60s | Activity intent users with **any** activity overlap (ignore detail) | Set `isFallbackMatch: true` |
| **C — Quick pool** | after 60s or user taps “Widen search” | All eligible (same as quick intent fallback) | Set `isFallbackMatch: true`; UI copy explains widened match |

**Quick intent:** Never apply phase A/B hard filters. Optional activities only affect score (soft).

**Cross-intent matching:**

| Requester | Candidate | Phase A | Phase B | Phase C |
|-----------|-----------|---------|---------|---------|
| activity | activity | shared activity required | shared activity | anyone |
| activity | quick | skip A | optional activity boost only | yes |
| quick | activity | no hard filter | no hard filter | yes |
| quick | quick | existing behavior | existing behavior | existing behavior |

> **Rationale:** Avoid starving activity users while not forcing quick users through activity filters.

### 8.4 Minimum score

- Phase A/B: keep `minScoreToMatch: 35` but candidate must pass activity filter first.
- Phase C: existing fallback scoring (`tryFallbackMatch`) unchanged.

### 8.5 Redis indexes (optional v1.1)

Defer `match:idx:activity:{id}` until pool size justifies it. v1 can filter in scorer after batch fetch.

---

## 9. API changes

### 9.1 Match prep (authenticated)

| Endpoint | Change |
|----------|--------|
| `GET .../match-prep/options` | Add `activities[]` with `detailMode`, `detailLabel`, `detailMaxLength` |
| `GET .../match-prep/current` | Add `matchIntent`, `activitySelections[]` |
| `POST .../match-prep` | Accept `matchIntent`, `activitySelections`; validate per §7 |

**Repository:** Extend `matchPrepStatusRepository.replaceMatchPrepCurrentStatus` → replace `current_status_activities` in same transaction (mirror moods delete+insert).

**After save:** `refreshProfileSnapshotFromDatabase(userId)` — already called; must include new fields.

### 9.2 Guest match prep

| Change | v1 |
|--------|-----|
| Add activities to guest prep | **Optional** — if added, activity intent not required for guests (keep guest flow simple) |
| Guest find match | Guests stay **quick intent only** unless product explicitly expands trial |

Document in guest QA checklist when implemented.

### 9.3 Find match

| Option | v1 recommendation |
|--------|-------------------|
| Pass `matchIntent` on find | **No** — read from saved `current_status.match_intent` snapshot |
| Reject find if activity intent but no activities saved | **Yes** — `409 ACTIVITY_PREP_INCOMPLETE` with message to complete prep |

### 9.4 Spaces

| Endpoint | Change |
|----------|--------|
| `POST .../spaces` | Optional `activitySelections[]` (max 5) |
| `GET .../spaces/active`, space detail | Include `activities[]` in response |

### 9.5 Peer preview

Extend `getMatchPeerPreview` to show shared session activities (and detail when both present) — read-only, no scoring change.

---

## 10. Client changes (touch list)

| Area | File / area | Change |
|------|-------------|--------|
| Intent picker | New component or hero section | Quick vs Activity before prep |
| Match prep dialog | `match-prep-dialog.tsx` | Activities section + intent |
| Match prep types/utils | `match-prep.types.ts`, `match-prep-dialog.utils.ts` | Form state |
| Profile setup API types | match prep save/load | New fields |
| Dashboard flow | `use-app-match-flow.ts`, `dashboard-page.tsx` | Pass intent into prep |
| Start space modal | form schema + modal | Activity picker |
| Find match error | `useFindMatch.ts` | Handle `ACTIVITY_PREP_INCOMPLETE` |
| Searching UI | hero / searching state | Fallback widen CTA at 45s for activity intent |

---

## 11. Edge cases & regression guardrails

### 11.1 Data & validation

| # | Case | Expected behavior |
|---|------|-------------------|
| E1 | Inactive activity id in save payload | 400 `ACTIVITY_INVALID` |
| E2 | Duplicate activity ids in one save | 400 `ACTIVITY_DUPLICATE` |
| E3 | Detail only whitespace | Treat as missing → 400 if required |
| E4 | Detail 81+ chars | 400 `ACTIVITY_DETAIL_TOO_LONG` |
| E5 | Activity intent, zero activities | 400 client block + server `ACTIVITY_REQUIRED` |
| E6 | Quick intent, zero activities | Allowed (current users unaffected) |
| E7 | Quick intent, 4 activities | 400 max 3 |
| E8 | Switch intent activity→quick without clearing activities | Allowed; extra activities still saved, soft score only |
| E9 | Switch quick→activity without adding activities | Block save |
| E10 | Deactivate catalog row user already saved | Historical rows remain; new picks blocked; matching uses id from snapshot |

### 11.2 Match prep & snapshot

| # | Case | Expected behavior |
|---|------|-------------------|
| E11 | User skips prep (“Skip, just match”) | Unchanged: only for **quick** flow; activity intent hides skip or routes back |
| E12 | `refreshProfileSnapshotFromDatabase` fails | Log warning (existing); matching may use stale data — do not fail save |
| E13 | Old snapshot without `activities` | Parser → `[]`, `matchIntent: quick` |
| E14 | `getMatchPrepPromptStatus` | Extend `hasPrep` check: if last saved intent was `activity`, require ≥1 activity |
| E15 | Edit preferences mode | Load saved intent + activities; changing intent re-validates |

### 11.3 Matching & concurrency

| # | Case | Expected behavior |
|---|------|-------------------|
| E16 | Find match while already searching | Idempotent 200 (existing) |
| E17 | Already in room | 409 `ALREADY_IN_SESSION` (existing) |
| E18 | Blocked users | Existing block sync unchanged |
| E19 | Guest not ready | Existing guest assert unchanged |
| E20 | Activity strict phase, zero candidates online | Continue searching until phase B/C; do not `no_match` early |
| E21 | Both activity users, same activity, different language detail | Match in phase B with score boost only if details match; phase A requires shared id only (detail is bonus not filter in A) |
| E22 | User A chess + User B chess | Phase A match; in-room chess still manual invite |
| E23 | Fallback match | `isFallbackMatch: true` in API (existing field) |

**Clarification for E21 (phase A filter):** Phase A requires **shared activity id** only. Detail match affects score, not hard filter in A. Phase B same. Optional future: strict language filter toggle.

### 11.4 Spaces

| # | Case | Expected behavior |
|---|------|-------------------|
| E24 | Create space without activities | Allowed (v1) |
| E25 | Create space with invalid activity id | 400 validation error; room not created |
| E26 | Edit scheduled space (future) | Out of v1 unless edit flow exists — document when added |
| E27 | `roomType: direct` vs `space` | Activities independent of room type |
| E28 | Category `match` (engine-created) | No host activities; engine rooms unchanged |

### 11.5 Naming collisions

| # | Case | Expected behavior |
|---|------|-------------------|
| E29 | “Activities” in room video panel | UI copy: session = “What you want to do”; in-room = “Room activities” or keep chess panel as-is |
| E30 | `play_chess` session tag vs chess Redis game | Session tag does not auto-create game |
| E31 | Overlap with looking for “venting” | Both allowed; session activity is specific intent |

### 11.6 Security & abuse

| # | Case | Expected behavior |
|---|------|-------------------|
| E32 | XSS in detail/title | Store plain text; escape on render |
| E33 | Spam details in matching | Length limit + normalize; no PII requirement |
| E34 | UUID guessing activity ids | Server validates against DB active rows |

---

## 12. Non-goals (v1)

- Space discovery **filter by activity** (v1.1)
- Auto-start chess when both matched with `play_chess`
- Removing or merging **looking for** options
- New `roomType` enum value
- Activity-based **group** matching (spaces only for group)
- ISO language code enforcement
- ML / semantic topic matching

---

## 13. Migration & rollout

1. **Migration SQL:** `activities`, `current_status_activities`, `room_activities`, `match_intent` on `current_status`.
2. **Seed:** upsert script like `onboarding-lookups.data.ts` — idempotent by `name`.
3. **Deploy server** with new fields optional in API responses first (if doing phased deploy).
4. **Deploy matching-service** with backward-compatible snapshot parser.
5. **Deploy client** with intent picker + activities UI.
6. **No backfill required** — existing users default to `quick`, empty activities.

---

## 14. Test matrix (must pass before merge)

### 14.1 Unit / integration — server

- [ ] Save/load match prep: quick, no activities  
- [ ] Save/load match prep: activity, 1 activity + required detail  
- [ ] Reject activity intent without activities  
- [ ] Reject missing required detail per `detail_mode`  
- [ ] Reject inactive/unknown activity id  
- [ ] Transaction: failed activity insert rolls back moods/interests replace  
- [ ] Snapshot JSON includes activities after save  
- [ ] Create space with 0 and with 2 activities  
- [ ] Create space rejects invalid activity id  

### 14.2 Matching-service

- [ ] Parser: old snapshot → empty activities, quick intent  
- [ ] Scorer: activity overlap increases score  
- [ ] Scorer: detail match adds bonus  
- [ ] Scorer: zero activities → activity weight 0 (no regression vs today)  
- [ ] Activity intent strict phase filters candidates  
- [ ] Fallback sets `isFallbackMatch`  

### 14.3 Client E2E (manual)

- [ ] Quick match end-to-end unchanged for user who never opens activities  
- [ ] Activity match requires pick before save  
- [ ] Skip prep still works for quick  
- [ ] Edit preferences round-trip  
- [ ] Space create with activities appears in space card/detail  
- [ ] Peer preview shows shared activity when applicable  

### 14.4 Regression — must not break

- [ ] Mood / looking for / interest required validation  
- [ ] Location preference validation  
- [ ] Guest trial match flow  
- [ ] Block list enforcement  
- [ ] In-room chess invite/move/end (unchanged)  
- [ ] Match category room creation by engine  
- [ ] `replaceMatchPrepCurrentStatus` interest replace behavior  
- [ ] Onboarding profile steps completion %  

---

## 15. Implementation checklist (ordered)

1. DB schema + migration + seed `activities`  
2. Drizzle schema + relations on `current_status`  
3. `match-prep.schema.ts` validation + error codes  
4. `matchPrepStatusRepository` + service save/load  
5. `findProfileSnapshotForCache` include activities + intent  
6. `matching-service` snapshot parser + scorer weights  
7. Orchestrator phases / fallback for `matchIntent === activity`  
8. Find match guard: activity intent without saved activities  
9. Client: intent picker + match prep activities UI  
10. Space create schema + repository + API response  
11. Peer preview + tests  
12. Update [matching-system-design.md](./matching-system-design.md) Redis field appendix (optional)  

---

## 16. Open decisions (confirm before coding)

| # | Question | Recommendation |
|---|----------|----------------|
| D1 | Phase A: filter by shared activity id only, or also detail? | **Id only** (detail = score bonus) |
| D2 | Auto-suggest space title from activity detail? | **Yes**, editable |
| D3 | Guest users get activities in prep? | **Defer** — quick only for guests v1 |
| D4 | Hide “Skip, just match” for activity intent? | **Yes** |
| D5 | Space activities required? | **No** in v1 |

---

## 17. Copy reference (UI)

| Context | English |
|---------|---------|
| Intent — quick | **Quick match** — Find anyone based on your mood and interests |
| Intent — activity | **Match by activity** — Match with someone doing the same thing |
| Section title | **What do you want to do?** |
| Fallback CTA | **No one on this activity right now — widen search?** |
| Fallback toast | Matched with a wider pool (`isFallbackMatch`) |

---

*When implementation starts, link PRs to this doc and tick §14 checkboxes in the PR description.*
