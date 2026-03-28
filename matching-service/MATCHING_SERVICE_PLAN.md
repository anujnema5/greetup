# Matching Service Plan (Bun + Redis)

## Why this service exists

Build a separate service that only does matchmaking.  
It should:

- take a user request and place it in a matching pool
- read `user:profile:snapshot:{userId}` from Redis
- find compatible candidates using `matchIds` + profile constraints
- enforce **bidirectional acceptance** (`A accepts B` and `B accepts A`)
- lock matched users until room creation finishes (or lock timeout)
- support timeout + retry safely (no duplicate/conflicting matches)

---

## Step 0 (current step): scaffold + design

This document is the first deliverable.  
Next, we will add Bun project files and then implement incrementally.

---

## Proposed Redis model

### 1) Profile snapshot (source for matching checks)

- `user:profile:snapshot:{userId}` (Hash/JSON string)
- Includes:
  - identity fields: `userId`, `matchIds[]`
  - preference filters: gender/age range/location/language/etc
  - own attributes used by others' filters
  - `version` and `updatedAt` (for stale protection)

### 2) Matchmaking pool

- `mm:pool:global` (Sorted Set, score = enqueue timestamp)
- Optional segment pools later (for scale), e.g. `mm:pool:region:{region}`

### 3) Availability and lock keys

- `mm:state:{userId}` -> `free | searching | locked | matched | in_room`
- `mm:lock:user:{userId}` (string, TTL, value = `attemptId`)
- `mm:pair:lock:{lowUserId}:{highUserId}` (string, TTL, prevents double pairing)

### 4) Attempt/result tracking

- `mm:attempt:{attemptId}` (Hash) for observability and retries
- `mm:user:last-attempt:{userId}` -> most recent attempt id

---

## Match lifecycle (single request)

1. User requests match.
2. Service validates user is `free`.
3. Service loads snapshot from `user:profile:snapshot:{userId}`.
4. Service pushes user into pool (`mm:pool:global`) and sets `state=searching`.
5. Worker picks candidates from pool by recency + candidate `matchIds`.
6. For each candidate:
   - skip self / offline / locked / already matched
   - load both snapshots
   - run **bidirectional validation**
   - if pass: try atomic lock acquisition for both users
7. If both locks acquired:
   - mark both as `locked`
   - emit `match.proposed` / room creation request
8. If room created successfully:
   - mark both `in_room`
   - remove from pool
   - clear temporary attempt keys
9. If room creation fails or times out:
   - release locks
   - apply retry policy
   - users return to `searching` or `free` depending on retry count

---

## Bidirectional validation (must-have)

Before confirming `A <-> B`, run:

- `accepts(A.filters, B.attributes)` -> boolean
- `accepts(B.filters, A.attributes)` -> boolean

Only if both are `true` do we proceed to lock + room creation.

This prevents one-sided matches such as:
- A likes B, but B's filters reject A.

---

## Locking strategy (room-not-established protection)

Use short TTL locks so users do not remain blocked forever:

- user lock TTL: 15-30s
- pair lock TTL: 15-30s

Acquire in deterministic order (`min(userId) -> max(userId)`) to reduce deadlock risk.

If room is not established before TTL:

- locks auto-expire
- users become eligible again
- retry logic decides requeue timing

Use Lua script later for atomic:
- validate states
- set both user locks
- set pair lock
- update both states to `locked`

---

## Timeout + retry policy

### Suggested defaults (initial)

- `searchTimeoutMs = 25000`
- `lockTtlMs = 20000`
- `roomCreateTimeoutMs = 7000`
- `maxRetries = 3`
- backoff: `500ms, 1500ms, 3500ms` (+ jitter)

### Retry rules

- Retry on transient errors (lock collision, room timeout, temporary Redis/API issues).
- Do not retry on hard rejection (bidirectional filter fail).
- After max retries:
  - set user `free`
  - return "no match found now, try again" style response/event.

---

## Safety and idempotency

- Every request gets `attemptId`.
- Repeated client requests with same id should return same in-flight outcome.
- Room creation call should be idempotent with `attemptId`/`pairId`.
- State transitions should be validated (`free -> searching -> locked -> in_room`).

---

## Bun service shape (next step)

Planned folders:

- `matching-service/src/app.ts` (service bootstrap)
- `matching-service/src/redis/*` (Redis client + scripts)
- `matching-service/src/matchmaking/*` (pool, validator, lock manager, retry engine)
- `matching-service/src/contracts/*` (event/API payloads)
- `matching-service/src/config/*` (timeouts, tuning knobs)

We can run as:

- HTTP + worker loop, or
- event-driven consumer (preferred if your platform already emits "find match" events)

---

## Milestones (slow, step-by-step)

1. **Scaffold Bun project**
   - `bun init`
   - basic TypeScript config
   - health endpoint
2. **Redis integration**
   - connection manager
   - key helpers
   - basic pool operations
3. **Snapshot validation layer**
   - parse and validate `user:profile:snapshot:*`
4. **Bidirectional matcher**
   - pure function checks + tests
5. **Lock manager + Lua atomics**
   - dual lock, pair lock, safe release
6. **Room orchestration**
   - call room service with timeout
   - retry/backoff
7. **Observability**
   - metrics, logs, attempt tracing
8. **Load and failure testing**
   - race simulation
   - lock expiry and retry behavior

---

## Open decisions before coding

1. Should matching trigger be API-driven, queue-driven, or both?
2. Is room creation inside this service or delegated to existing server module?
3. What is canonical `userId` format for deterministic ordering?
4. Which fields inside `user:profile:snapshot:*` are mandatory in v1?
5. Do we need segment pools (region/language/gender) in v1 or only global pool?

