# How `rtc-service` uses Redis (beginner-friendly)

**Path style:** `rtc-service` references below use **kebab-case file names with extension** (for example `create-app.ts`, `room-registry.ts`).

This doc explains **what Redis is doing for the real-time (WebRTC / mediasoup) service**, in plain language. You do **not** need to be a Redis expert to follow it.

---

## 1. Redis in one minute

**Redis** is an **in-memory database**: very fast key–value store, usually running as a separate process (e.g. on port 6379).

- You **set** values under a **key** (like a variable name).
- You **get** them later, from **any** machine that can talk to the same Redis.
- Keys can expire automatically (**TTL** = time to live), so old call data does not stay forever.

For `rtc-service`, Redis is **not** where video flows. Video/audio still goes over WebRTC. Redis holds **small metadata**: who is in which room, which server instance “owns” a room, and a few hints for the main API.

---

## 2. Why we use Redis here

`rtc-service` can run **more than one instance** (horizontal scaling). Then:

- Each instance has its **own memory** (and its own mediasoup **Router** objects).
- Clients must hit the **correct** instance for a given call room.

Redis gives a **shared source of truth** that all instances read:

1. **Which rtc-service instance owns this room’s mediasoup router?**
2. **Which user IDs are currently peers in that room?**
3. **Optional metadata** (router id, created time) for debugging or future tools.

Without Redis (or something like it), instances would not agree on ownership or membership across processes.

---

## 3. How we connect (code)

- Library: **`ioredis`** (Node Redis client).
- URL: **`REDIS_URL`** (default `redis://127.0.0.1:6379`) — see `rtc-service/src/shared/config/env.ts`.
- On startup, **`index.ts`** calls **`connectRedis()`**, which connects and runs **`PING`** to verify Redis is alive (with a timeout). See `rtc-service/src/core/redis/client.ts`.

If Redis is down at startup, the service does not treat the connection as healthy until `PING` returns `PONG`.

---

## 4. Redis data types we actually use

If you are new to Redis, these are the only shapes that matter in this service:

| Type (concept) | What it is | We use it for |
|----------------|------------|----------------|
| **String** | One value per key | Room owner instance id; “user’s active RTC room” hint |
| **Hash** | Many fields on one key (like a small object) | Room metadata; per-peer metadata |
| **Set** | Unordered unique strings | List of peer (user) ids in a room |
| **Pub/Sub channel** | Publish messages; subscribers listen | Room media events (producer added/removed) |

---

## 5. All keys (naming cheat sheet)

Defined in `rtc-service/src/core/redis/keys.ts`:

| Key pattern | Redis type | Purpose |
|-------------|------------|---------|
| `rtc:room:{roomId}` | **Hash** | Room metadata: `routerId`, `ownerInstanceId`, `createdAt`, `updatedAt` |
| `rtc:room:{roomId}:owner` | **String** | **Which rtc-service instance** owns this room’s router (your `rtcInstanceId`) |
| `rtc:room:{roomId}:peers` | **Set** | User ids currently joined on the SFU for this room |
| `rtc:peer:{peerId}` | **Hash** | One peer’s metadata: `roomId`, `joinedAt`, `rtcInstanceId`, `socketId` |
| `rtc:room:{roomId}:events` | **Pub/Sub channel** | JSON events: producer added / removed (for optional fan-out) |
| `user:active_rtc_room:{userId}` | **String** | Written mainly by the **main API** when issuing an RTC JWT; rtc-service **reads/deletes carefully** — must stay in sync with naming in the main server |

---

## 6. TTL (expiration)

Room-related keys use a shared TTL constant:

- **`RTC_ROOM_METADATA_TTL_SECONDS`** = **24 hours** (`rtc-service/src/core/redis/constants.ts`).

So: owner key, room hash, peer hash, and room peer set get **`EXPIRE`** refreshed/updated so they **auto-delete** after roughly a day if not touched. That avoids infinite growth if something crashes without cleanup.

**Note:** The main API’s `user:active_rtc_room` uses a **different** TTL (4 hours in `server/.../user-active-rtc-room-redis.service.ts`). Same **key name**, different service — both must agree on the **string format** (room id).

---

## 7. Room ownership: `rtc:room:{roomId}:owner`

**Problem:** Two instances must not both think they own the same room’s mediasoup router.

**Solution:** One Redis string key per room. Value = winning instance’s **`rtcInstanceId`**.

Flow (`modules/rtc/room/room-registry.ts` → `getOrCreateLocalRoom`):

1. Read `GET rtc:room:{roomId}:owner`.
2. If it exists and is **another** instance → return **`WRONG_INSTANCE`** + that owner id so the **client** can reconnect to the right place.
3. If it does **not** exist, try **`SET ... NX`** with expiry:
   - **`NX`** = “only set if key does **not** exist” → first instance wins; others retry and see the winner.

After this process, the instance that owns the room creates the **in-memory** mediasoup `Router` (Redis **cannot** store a Router — see below).

---

## 8. Room metadata hash: `rtc:room:{roomId}`

When a local router is created, we **`HSET`** fields such as:

- `routerId` — mediasoup router id  
- `ownerInstanceId` — same as owner string  
- `createdAt` — kept if the hash already had it (room “logical” creation)  
- `updatedAt` — last update timestamp  

Then **`EXPIRE`** on the hash key for the 24h TTL.

**Reading** this hash is in `modules/rtc/room/room.repository.ts` (`getRoomRecord`) — useful for admin/debug tooling, not required for every WebRTC packet.

---

## 9. Who is in the call: `rtc:room:{roomId}:peers`

This is a Redis **SET** of **user ids** (peers).

- **`SADD`** when a peer is saved (`modules/rtc/peer/peer.repository.ts` → `savePeer`).
- **`SREM`** when a peer is removed (`deletePeer`).
- **`SMEMBERS`** to list everyone in the room (`listPeerIdsInRoom`).

The **main API** can cross-check this set against `user:active_rtc_room:{userId}` to drop stale “user is in a call” hints when the SFU no longer lists them — see comments in `user-active-rtc-room-redis.service.ts`.

---

## 10. Per-peer hash: `rtc:peer:{peerId}`

Each joined user gets a small **hash**:

- `roomId`, `joinedAt`, `rtcInstanceId`, `socketId`

Written in **`savePeer`**, deleted in **`deletePeer`**, read in **`getPeer`**. Again: operational / future admin use; the hot path for media is still in-memory mediasoup + sockets.

---

## 11. Pub/Sub: `rtc:room:{roomId}:events`

When producers are added or removed, rtc-service can **`PUBLISH`** a JSON message on this channel (`publishRoomMediaEvent` in `modules/rtc/peer/peer.repository.ts`).

- **Publish** = fire-and-forget; if nobody is subscribed, messages are dropped (that is normal for Pub/Sub).
- This is described in code as **optional cross-service fan-out** — another service could **`SUBSCRIBE`** to react (e.g. analytics, recording coordinator). The core call does not require a subscriber for media to work.

Event shapes (TypeScript types in `modules/rtc/peer/peer.repository.ts`):

- `producer_added` — `roomId`, `peerId`, `producerId`, `kind`
- `producer_removed` — `roomId`, `peerId`, `producerId`

---

## 12. `user:active_rtc_room:{userId}` (shared with main API)

- **Main API** sets this when it gives the user an RTC token (so the rest of the product knows “they intended to join this room”).
- **rtc-service** **`clearUserActiveRtcRoomIfMatches`** (`modules/rtc/peer/peer.repository.ts`):
  - **`GET`** the key.
  - If value **equals** the `roomId` we are leaving, **`DEL`** the key.
  - If the user started a **new** room elsewhere, the value might differ — we **do not** delete (avoids wiping a newer session).

So: **same key name** in two codebases; **contract** is “string = room id”.

---

## 13. What is **not** stored in Redis

Important mental model:

| Thing | Where it lives |
|--------|----------------|
| mediasoup **Router**, **Transports**, **Producers**, **Consumers** | **RAM of the rtc-service process** that owns the room |
| Socket.IO connections | That process |
| Actual audio/video | WebRTC (UDP), not Redis |

Redis only helps **route users to the right instance** and **remember lightweight membership/metadata**.

---

## 14. End-to-end story (join)

1. Client connects to an rtc-service instance with a JWT / room id (your signaling stack).
2. Service calls **`getOrCreateLocalRoom(roomId)`**:
   - Uses Redis **owner** key to decide if **this** instance should host the router.
3. If **wrong instance** → client gets **`WRONG_INSTANCE`** and should use **`ownerInstanceId`** to connect to the correct host.
4. If **right instance** → mediasoup router created in memory; room **hash** updated in Redis.
5. On join, **`savePeer`** writes **peer hash** + **`SADD`** to **room peers set** + TTLs.

On leave, **`removeSession`** (when not skipping Redis) deletes peer data and may **`releaseRoom`** if the room is empty — which **`DEL`**s owner, room hash, and peers set **if** this instance still owns the owner key.

---

## 15. Pipelines (`MULTI`/`pipeline`)

In a few places we use **`redis.pipeline()`** to send several commands in one round-trip (e.g. multiple `HSET`s). That is an optimization; logically it is the same as running the commands one by one.

---

## 16. Files to read in the repo

| File | Role |
|------|------|
| `rtc-service/src/core/redis/client.ts` | Connect / disconnect / `getRedis()` |
| `rtc-service/src/core/redis/keys.ts` | All key string patterns |
| `rtc-service/src/core/redis/constants.ts` | TTL |
| `rtc-service/src/modules/rtc/room/room-registry.ts` | Owner claim, room hash, `releaseRoom` |
| `rtc-service/src/modules/rtc/peer/peer.repository.ts` | Peer hash, peers set, publish, clear active room |
| `rtc-service/src/modules/rtc/room/room.repository.ts` | Read room hash |
| `server/src/modules/rooms/services/user-active-rtc-room-redis.service.ts` | Main API side of `user:active_rtc_room` |

---

## 17. Glossary

- **Key** — Name of an entry in Redis (e.g. `rtc:room:abc:owner`).
- **TTL / EXPIRE** — Key disappears after N seconds unless refreshed.
- **NX** — “Set only if not present” (used for a simple distributed lock / first-wins owner).
- **Hash** — One key, many fields (`HSET` / `HGETALL`).
- **Set** — Unique members (`SADD` / `SREM` / `SMEMBERS`).
- **Pub/Sub** — Publisher sends to channel; subscribers receive (no persistence by default).

---

If you add new Redis keys, **update `rtc-service/src/core/redis/keys.ts` and this doc** so the contract stays obvious for the next person (including future you).
