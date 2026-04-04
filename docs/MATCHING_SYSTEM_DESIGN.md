# Matching System Design

## 1. Overview

Users request a room → System finds best available match (Redis) → Creates room → Both connect. No DB hit during matching.

---

## 2. Architecture

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────▶│   API    │────▶│  Redis   │
│ (Find)   │     │  Server  │     │ (Match)  │
└──────────┘     └────┬─────┘     └──────────┘
                     │
                     │ sync on profile/preference change
                     ▼
              ┌──────────┐
              │PostgreSQL│
              │(Source)  │
              └──────────┘
```

---

## 3. Redis Data

### 3.1 Per-user hash

```
match:user:{profileId}
  g, a, pg, amin, amax, lat, lon, cc, city, av, i, gl, pr, ts, la
```

| Field | Meaning |
|-------|---------|
| g | gender |
| a | age |
| pg | preferred gender |
| amin, amax | age range |
| lat, lon | location |
| av | availability |
| i, gl, pr | interest, goal, profession IDs |
| ts | trust score |
| la | last active (unix) |

### 3.2 Indexes

| Key | Type | Purpose |
|-----|------|---------|
| match:idx:gender:{x} | Set | profileIds by gender |
| match:idx:online | Set | profileIds online |
| match:idx:age | Sorted Set | age → profileId |
| match:geo:location | Geo | lat/lon → profileId |
| match:idx:interest:{id} | Set | profileIds by interest |

### 3.3 Sync points

| Event | Action |
|-------|--------|
| Profile/preference update | storeMatchUserData() |
| User connect | Add to idx:online, update av |
| User disconnect | Remove from idx:online |

---

## 4. Matching Flow

```
1. Get candidates: SINTER/SMEMBERS by gender, online, age, geo
2. Exclude self
3. For each candidate: HGETALL match:user:{id}
4. Score: mutualScore(requester, candidate)
5. Sort by mutual score desc
6. Return top N
```

---

## 5. Mutual Score

```
mutualScore(A, B) = (score(A→B) + score(B→A)) / 2
```

**Factors:** reciprocal gender/age (30+30), shared interests (25), shared goals (15), recency (10), trust (10). Max ~120.

---

## 6. Room Creation

```
Requester clicks "Find"
  → Get scored candidates (best first)
  → For each: try claimUserForRoom(requester, candidate)
  → First successful claim → create room
  → Release lock
```

---

## 7. Race Condition

**Problem:** A and C both want B.

**Fix:** Redis lock before room create.

```
SET room:claim:{profileId} {requesterId} EX 15 NX
  → Success: create room, del lock
  → Fail: try next candidate
```

---

## 8. Online Presence

```
CONNECT:
  sadd online_users:{userId} {socketId}
  sadd all_online_users {userId}
  sadd match:idx:online {profileId}
  hset match:user:{profileId} av available

DISCONNECT:
  srem online_users:{userId} {socketId}
  if scard = 0:
    srem all_online_users, match:idx:online
    hset av offline
```

---

## 9. Data Flow Diagram

```
Profile Change          Connect              Disconnect
      │                    │                     │
      ▼                    ▼                     ▼
  storeMatchUser    Add to idx:online     Remove from idx:online
  (hash + indexes)  Update av             Update av
      │                    │                     │
      └────────────────────┴─────────────────────┘
                          │
                          ▼
                    ┌──────────┐
                    │  Redis   │
                    └────┬─────┘
                         │
              findMatches() + mutualScore()
                         │
                         ▼
                    Room + Lock
```

---

## 10. Redis Keys Summary

```
match:user:{profileId}      Hash
match:idx:gender:{gender}    Set
match:idx:online             Set
match:idx:age                Sorted Set
match:geo:location           Geo
match:idx:interest:{id}      Set
match:idx:goal:{id}          Set
match:idx:country:{cc}        Set
room:claim:{profileId}       String (lock, TTL 15s)
```

---

## 11. Scalability

| Component | Scale |
|-----------|-------|
| API | Stateless, horizontal |
| Redis | Single → Cluster if needed |
| Matching | Read-only from Redis |
| Lock | Per-user, short TTL |

---

## 12. Profile Cache Sync (v2)

Goal: keep Redis fast and mostly correct, without hitting PG on every login.

### 12.1 Golden rule

- PostgreSQL = source of truth
- Redis = read cache for fast matching/session reads
- Use `updated_at` (or `profile_version`) in both PG and Redis

### 12.2 Login flow (cache-first, version-aware)

```
1. User authenticates
2. Read profile from Redis: profile:{userId}
3. If cache miss:
     - fetch PG
     - write Redis (with updated_at/version)
     - return
4. If cache hit:
     - trust Redis if fresh (TTL valid)
     - optionally run lightweight stale-check (sampled/background)
5. If stale detected:
     - refresh from PG and overwrite Redis
```

### 12.3 PUT /user flow (write-through)

```
1. Update PG (single transaction)
2. Get new updated_at/version from PG response
3. Write same payload to Redis immediately
4. Publish user.updated event
5. Workers consume event and refresh any derived Redis indexes
```

### 12.4 Failure handling

```
PG success + Redis fail:
  - return success to user (truth already in PG)
  - push retry job (or outbox event)
  - retry Redis sync with backoff
  - track metric + alert on high failure rate
```

### 12.5 Concurrency safety

```
When writing Redis, include version guard:
  only apply update if incoming_version >= cached_version
```

This avoids older requests overwriting newer profile data.

### 12.6 Observability

Track:
- cache hit ratio
- PG fallback count
- stale refresh count
- Redis sync failure + retry success
- sync latency (PG commit -> Redis updated)
