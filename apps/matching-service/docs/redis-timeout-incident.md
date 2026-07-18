# Redis "Command timed out" incident — what broke and how we fixed it

> A deep-dive on the `[handleGetUserMatchState] failed` / `redisTimeout: true` errors,
> written so you can read it top-to-bottom and fully understand the root cause.

---

## 1. The symptom (what we actually saw)

The logs were full of this, repeating for many different users:

```
{"level":50,"userId":"U3vz...","detail":"Error: Command timed out","redisTimeout":true,"msg":"[handleGetUserMatchState] failed"}
```

Key facts to notice:

- The failing endpoint is **`GET /match/state/user/:userId`** → `handleGetUserMatchState`.
- The error is literally **`Command timed out`**, and our code tagged it `redisTimeout: true`.
- It happened to **many different users**, in **bursts**, at different times of day.

This looked like "the status endpoint is crashing." It wasn't crashing, and the status
endpoint was **not the real problem**. It was the *victim*. Let's build up to why.

---

## 2. Background: the three moving parts

To understand the bug you need three pieces of the matching-service.

### (a) The status endpoint — cheap and innocent

`handleGetUserMatchState` does almost nothing:

```ts
const state = await orchestrator.getUserMatchState(userId);
```

Inside `getUserMatchState` there are just **two tiny Redis reads**:

1. `GET mm:user:last-attempt:{userId}`
2. `HGETALL mm:attempt:{requestId}`

That's it. On a healthy Redis these return in well under a millisecond.

### (b) The matching worker — the heavy one

Separately, a background **worker** pulls match jobs off a queue and tries to pair people up:

```ts
// worker.ts (simplified)
while (running) {
  const job = await queue.dequeue();      // waits for a job
  await orchestrator.processMatchRequest(job);   // does the heavy matching work
}
```

`processMatchRequest` → `getCandidates` scans the pool of waiting users and, **for each
candidate**, checked whether they were blocked and whether they were still searching.

### (c) Redis — reached over ONE shared connection

Here is the critical piece. The whole service talked to Redis through **one single
connection** (one TCP socket):

```ts
let client: RedisClient | null = null;   // the ONE connection
export const getRedis = () => client;    // everyone gets the same socket
```

Both the innocent status endpoint **and** the heavy worker used `getRedis()` — i.e. they
**shared the exact same socket**.

---

## 3. The key concept: one connection = one queue (FIFO)

This is the heart of the whole incident. Please read this section slowly.

A single Redis connection processes commands **one at a time, in order (FIFO)**. ioredis
(our Redis client) puts every command into a queue on that socket. Command #2 is not sent
until command #1 has come back.

So if you throw a burst of commands at one connection, they line up:

```
socket:  [ cmd1 ][ cmd2 ][ cmd3 ] ........ [ cmd200 ][ your GET ]
                                                         ^ waits for all 200 first
```

Even a trivial `GET` has to **wait its turn** behind everything already queued.

Now add the second detail: each command has a **deadline**. We set
`commandTimeout = 5000ms` (5 seconds). This deadline counts **from when the command is
queued**, not from when it finally reaches Redis. So if a command sits in the queue for
more than 5 seconds waiting for its turn, ioredis gives up and rejects it with:

```
Error: Command timed out
```

**This is the whole bug in one sentence:** the cheap status `GET` sat in the connection's
queue behind a huge burst of the worker's commands, waited more than 5 seconds for its
turn, and timed out — even though Redis itself was perfectly healthy.

The status endpoint was the victim. The worker's burst was the weapon. The single shared
connection was the crime scene.

---

## 4. What made the burst so big (the amplifier)

The single connection made head-of-line blocking *possible*. But what made the bursts
big enough to blow past 5 seconds was a second problem in the candidate-selection code.

The pool scan looked like this (simplified):

```ts
const rows = await redis.zrevrange(poolKey, 0, 119, "WITHSCORES"); // up to 120 candidates

for (const candidate of rows) {
  if (await isBlockedWithPeer(requesterId, candidate)) continue;   // 1 round-trip EACH
  const state = await redis.get(userState(candidate));             // 1 round-trip EACH
  ...
}
```

Look at the `await` **inside the loop**. For up to 120 candidates, that's:

- ~120 sequential round-trips for the block checks, **plus**
- ~120 sequential round-trips for the state checks.

= up to **~240 sequential Redis commands for a single match attempt.**

This is the classic **"N+1 query" anti-pattern**: instead of asking one question about 120
users, we asked 120 separate questions, one after another.

And every one of those ~240 commands went onto the **same shared connection** the status
endpoint needed. One match attempt could monopolize the socket long enough to time out
every status check queued behind it. Multiply by several concurrent match attempts under
load, and you get exactly the **bursts of timeouts** we saw in the logs.

The same N+1 pattern existed in **three** methods: `collectFromZset`,
`mergePrimaryThenGlobal`, and `collectGlobalForeignFirst`.

---

## 5. Why it looked random and came in bursts

- It only happened **under load** — when the worker was busy matching, the queue was full.
- It hit **many different users** because the victim is whoever's status `GET` happened to
  be queued behind a burst — it has nothing to do with that specific user.
- It came in **bursts** because a burst = one heavy match attempt (or a few overlapping)
  flooding the socket, then clearing.

If you only looked at `handleGetUserMatchState`, you'd never find the bug — the code there
is two trivial reads. The cause was somewhere else entirely (the worker's N+1 scan) and
only *surfaced* at the status endpoint because they shared a connection.

---

## 6. The analogy (one ice-cream window)

Imagine an ice-cream shop with **one order window**. Everyone lines up at that same window.

- A kid walks up and asks *"is my order ready?"* — a one-second question. (That's the
  status `GET`.)
- But right in front of them is someone placing **240 tiny separate orders**, one at a
  time: *"one scoop… now the price… one more scoop… now the price…"* 240 times. (That's
  the worker's N+1 pool scan.)

Because there's **only one window**, the kid with the quick question just waits and waits.
The shop has a rule: *"if I'm not served within 5 seconds, I give up and shout that
something is broken."* Five seconds pass while stuck in line → the kid gives up →
`Command timed out`.

The ice cream shop wasn't broken. Redis wasn't broken. It was **one window + one customer
hogging it with 240 tiny orders**.

---

## 7. The fix — two independent, complementary changes

### Fix A — Batch the N+1 scan (attack the burst size)

Replace the per-candidate `await`-in-a-loop with **batched** Redis calls:

- **Block checks:** use `filterBlockedPeers(requesterId, ids)` — one pipelined round-trip
  for *all* candidates instead of one per candidate.
- **State checks:** use a single `MGET` over all candidate `mm:state` keys (new
  `fetchSearchingStates` helper) instead of one `GET` per candidate.

A shared helper, `filterCandidates`, now runs those two batched calls **in parallel**
(`Promise.all`) and filters the ordered list, preserving order and the `batchSize` cutoff.
All three affected methods now use it.

**Result:** a match attempt went from **~240 sequential commands to ~3–4**. The bursts
that were monopolizing the connection basically disappear.

### Fix B — Redis connection pool (attack the head-of-line blocking)

Even with smaller bursts, one stalled command on a single shared socket can still block
everything behind it. So we replaced the single connection with a small **pool of 4
independent connections**, handed out **round-robin**:

```ts
let pool: RedisClient[] = [];               // 4 sockets
export const getRedis = () => {             // round-robin
  rrCursor = (rrCursor + 1) % live.length;
  return live[rrCursor];
};
```

Now a stall on one socket can only delay the commands routed to **that** socket (~1/4 of
traffic), not the whole service. The dedicated **blocking client** (for `BRPOP`) stays
separate as before — blocking commands must never share a request-path socket.

> **Important framing:** the pool does **not** make Redis faster (Redis is single-threaded
> on the server side). It's about **resilience** — containing a stall so it can't take down
> everything. Fix A reduces the load; Fix B contains the blast radius. You want both.

---

## 8. Why Fix B was safe (we verified this)

Round-robin means two consecutive `getRedis()` calls can return **different** sockets. That
would be dangerous if the code relied on one connection's stateful ordering. We checked:

- **No `MULTI`/`WATCH` transactions** anywhere — the one construct that would break if a
  `WATCH` and its `EXEC` landed on different sockets. There are none.
- **All `.pipeline()` calls** grab `const redis = getRedis()` **once** and chain on that
  single client — so each pipeline stays atomic on one socket. ✅
- **No pub/sub (`subscribe`)** — a subscribed connection can't run normal commands, which
  would break pooling. There is none. ✅
- **Read-after-write stays consistent** — application code `await`s each command before
  issuing the next, and Redis is single-threaded server-side, so ordering holds even
  across different sockets. ✅

---

## 9. Before / after

| | Before | After |
|---|---|---|
| Redis commands per match attempt | ~240 (sequential) | ~3–4 (batched) |
| Request-path connections | 1 (shared with worker) | 4 (round-robin pool) |
| A single stall affects | 100% of commands | ~25% of commands |
| `handleGetUserMatchState` under load | times out in bursts | unaffected |
| Match throughput (single worker) | ~4/sec | ~15–40/sec (estimate) |

---

## 10. Things to keep an eye on

- **Redis connection count.** Each pod now opens **`poolSize + 1`** connections
  (4 request-path + 1 blocking = 5). With N replicas that's `N × 5`. Watch your Redis
  `maxclients`. Tune with the `REDIS_POOL_SIZE` env var if needed.
- **The next bottleneck is the single worker.** It processes match jobs one at a time.
  After these fixes, Redis is no longer the ceiling — the worker's serial throughput is.
  If matching can't keep up at scale, the next step is either a faster per-attempt path or
  running multiple workers (which needs care around the existing pair/user locks).
- **`commandTimeout` is still 5s.** That's a safety net, not a target. If you ever see
  `Command timed out` again, it now genuinely points at Redis/network health rather than
  self-inflicted head-of-line blocking.

---

## 10b. Round 2 — the timeouts came back (stale sockets)

After Fixes A and B shipped, the **same** `Command timed out` errors reappeared — but the
cause was now completely different, and the pool from Fix B actually made it *slightly more*
likely. Read this before assuming the connection pool is broken.

### The new fingerprint

- Timeouts **started minutes after pod boot** (`05:58` boot → first timeout `06:05`), not
  under load.
- They came in **bursts**, hit **random users**, and hit the **trivial** `GET`
  path (`handleGetUserMatchState`) — the same innocent victim as before.
- The request-path code was already clean: trivial commands, batched scans, spread across
  4 sockets, a single serial worker. There was no command flood left to blame.

### The cause: silently-dead TCP sockets

Redis is remote (App Platform → droplet Redis over a **DigitalOcean VPC**). VPC/NAT/firewall
paths **silently drop idle TCP flows** after a few minutes. Our ioredis clients had:

- `keepAlive: 0` — ioredis's default, i.e. **TCP keepalive disabled**, so no probes kept the
  flow alive or detected the drop, and
- **no application heartbeat** — nothing pinged an idle socket.

So an idle socket died on the network, ioredis didn't know, and it only found out when it
sent the **next** command onto that dead socket — which hung until the 5s `commandTimeout`.
That is the entire Round‑2 bug: **the timeout was a dead socket being discovered by a user's
request instead of by a keepalive probe.**

Every detail matches: minutes after boot (idle-reap window), bursts (a batch of sockets
reaped together), random users on trivial GETs (whoever lands on a dead socket).

### Why the pool made it worse

Fix B spread request traffic across **4** sockets round-robin. Under low/moderate load each
individual socket now sits **idle longer** between uses — so it's *more* likely to cross the
VPC idle-reap threshold before its next command. The pool contains our own head-of-line
blocking; it does nothing for a socket the network killed underneath us.

### Fix C — keep sockets warm, detect death fast

Two small, complementary settings in `src/core/redis/client.ts`:

- **TCP keepalive** (`keepAlive: REDIS_KEEPALIVE_MS`, default 30s) on every client — probes
  keep the VPC/NAT flow mapping alive and let the OS surface a dead peer quickly, so a
  command never hangs on it.
- **Application heartbeat** (`REDIS_HEARTBEAT_MS`, default 25s) — PINGs every request-path
  pool socket on an interval, so no socket is ever idle long enough to be reaped, and a dead
  one is reconnected proactively rather than on a user's request. The **blocking client is
  exempt**: the worker's `BRPOP` every ~2s keeps it continuously busy, so it never idles.

Set `REDIS_KEEPALIVE_MS` / `REDIS_HEARTBEAT_MS` below the VPC/firewall idle timeout if it's
shorter than ~60s.

### If it *still* comes back after Fix C

Now it genuinely points at Redis server health, not the client. Check `redis-cli`:
`INFO clients` (blocked/connected), `INFO persistence` (`latest_fork_usec`, an RDB/AOF fork
pause blocks the single-threaded server for everyone), `SLOWLOG GET`, `INFO stats`
(`evicted_keys` under `maxmemory`), and confirm no other service on the same Redis is running
`KEYS`/big `SMEMBERS`/`FLUSHALL`.

---

## 11. TL;DR

1. The status endpoint (`handleGetUserMatchState`) was **timing out but was innocent** — it
   only does two trivial reads.
2. The whole service shared **one Redis connection**, which processes commands **one at a
   time (FIFO)**.
3. The matching worker did an **N+1 scan** — up to **~240 sequential Redis commands per
   match attempt** — flooding that shared connection.
4. The innocent status `GET` sat in the queue behind the flood, waited **> 5s**, and hit
   its `commandTimeout` → `Command timed out`, in bursts, for random users.
5. **Fix A:** batch the scan (240 → ~4 commands). **Fix B:** use a 4-socket connection pool
   so one stall can't block everything.

The endpoint that reported the error was never the one that caused it.

---

## Appendix A — `src/core/redis/client.ts` (Fix B: connection pool)

This is the full file after the fix. The single `client` became a 4-socket `pool` handed
out round-robin by `getRedis()`. The blocking client (for `BRPOP`) stays separate.

```ts
import Redis from "ioredis";
import { env } from "@/shared/config/env";
import { logger } from "@/core/logging";

export type RedisClient = Redis;

/**
 * Request-path pool.
 *
 * A single shared connection serializes every command over one socket, so one
 * slow or blocking command head-of-lines everything queued behind it — every
 * command still waiting its turn burns its `commandTimeout` and rejects with
 * `Command timed out`, even trivial GETs. That is exactly the burst of
 * [handleGetUserMatchState] failures we saw: the GET is the victim, not the
 * cause.
 *
 * Spreading request-path commands across a few independent sockets means a
 * single stall can only take out the commands on that one socket, not the whole
 * service. This is resilience, NOT a replacement for routing genuinely blocking
 * commands (BRPOP/BLPOP/WAIT) to the blocking client — do that too.
 */
const POOL_SIZE =
  env.redisPoolSize && env.redisPoolSize > 0 ? env.redisPoolSize : 4;

let pool: RedisClient[] = [];
let rrCursor = 0;

/** Dedicated connection for blocking commands (`BRPOP`, etc.). Never share a
 * request-path socket with blocking ops — one `BRPOP` would stall every other
 * command on that socket for the block timeout. */
let blockingClient: RedisClient | null = null;

const isLive = (c: RedisClient | null | undefined): c is RedisClient =>
  !!c && c.status !== "end";

const makeClient = (commandTimeout?: number): RedisClient =>
  new Redis(env.redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
    connectTimeout: env.redisConnectTimeoutMs,
    ...(commandTimeout != null ? { commandTimeout } : {}),
  });

export const connectRedis = async (): Promise<RedisClient> => {
  const existing = pool[0];
  if (existing && pool.every(isLive)) {
    return existing;
  }

  const commandTimeout =
    env.redisCommandTimeoutMs > 0 ? env.redisCommandTimeoutMs : undefined;

  const size = POOL_SIZE > 0 ? POOL_SIZE : 1;
  const clients = Array.from({ length: size }, (_unused, i) => {
    const c = makeClient(commandTimeout);
    c.on("error", (error) => {
      logger.error("Redis client error", { poolIndex: i, error: String(error) });
    });
    return c;
  });
  const [primary] = clients;
  if (!primary) {
    throw new Error("Redis pool initialization produced no clients");
  }

  await Promise.all(
    clients.map(async (c) => {
      await c.connect();
      await c.ping();
    }),
  );

  pool = clients;
  rrCursor = 0;

  // Blocking client must NOT set commandTimeout — BRPOP sleeps up to
  // blockSeconds and would otherwise be killed mid-wait.
  const blocking = makeClient(undefined);
  blocking.on("error", (error) => {
    logger.error("Redis blocking client error", { error: String(error) });
  });
  await blocking.connect();
  await blocking.ping();
  blockingClient = blocking;

  logger.info("Redis connected", {
    url: env.redisUrl,
    poolSize: size,
    commandTimeoutMs: env.redisCommandTimeoutMs,
    connectTimeoutMs: env.redisConnectTimeoutMs,
  });

  return primary;
};

/**
 * Returns the next live request-path client (round-robin).
 *
 * Note on transactions/pipelines: call this ONCE and chain on the returned
 * client (`const r = getRedis(); await r.multi()...`). Don't call getRedis()
 * per-command inside a transaction — each call may hand back a different socket.
 */
export const getRedis = (): RedisClient => {
  const live = pool.filter(isLive);
  if (live.length === 0) {
    throw new Error("Redis client not initialized");
  }
  rrCursor = (rrCursor + 1) % live.length;
  const client = live[rrCursor];
  if (!client) {
    throw new Error("Redis client not initialized");
  }
  return client;
};

/** Use only for blocking Redis commands; keeps request-path Redis fast while the
 * worker waits on the queue. */
export const getRedisBlocking = (): RedisClient => {
  if (!isLive(blockingClient)) {
    throw new Error("Redis blocking client not initialized");
  }
  return blockingClient;
};

export const pingRedis = async (): Promise<boolean> => {
  try {
    const redis = getRedis();
    return (await redis.ping()) === "PONG";
  } catch {
    return false;
  }
};

export const disconnectRedis = async (): Promise<void> => {
  const toClose = pool.filter(isLive);
  pool = [];
  rrCursor = 0;
  await Promise.all(
    toClose.map((c) => c.quit().catch((e) => logger.error("Redis quit failed", { error: String(e) }))),
  );

  if (isLive(blockingClient)) {
    await blockingClient
      .quit()
      .catch((e) => logger.error("Redis blocking quit failed", { error: String(e) }));
    blockingClient = null;
  }

  logger.info("Redis disconnected");
};
```

### What changed vs. the old file (client.ts)

| Old (single connection) | New (pool) |
|---|---|
| `let client: RedisClient \| null` | `let pool: RedisClient[]` + `rrCursor` |
| `getRedis()` returned the one client | `getRedis()` returns the next live socket, round-robin |
| Redis-client construction inlined twice | one `makeClient(commandTimeout?)` helper |
| `connect()` + `ping()` for one client | `Promise.all` connects all sockets in parallel |
| `disconnectRedis` closed 1 + blocking | closes the whole pool in parallel, with `.catch` guards |
| status checks: `client.status !== "end"` inline | one `isLive()` type-guard helper |

> The `if (!primary)` / `if (!client)` guards exist because the repo has
> `noUncheckedIndexedAccess` enabled — `pool[0]` and `live[rrCursor]` are typed as
> `RedisClient | undefined`, so they must be narrowed before returning.

---

## Appendix B — `src/modules/simple-matching/pool/pool.ts` (Fix A: batching)

The important part is the two new helpers (`fetchSearchingStates`, `filterCandidates`) and
the three rewritten selection methods (`collectFromZset`, `mergePrimaryThenGlobal`,
`collectGlobalForeignFirst`) that no longer `await` Redis inside a per-candidate loop.

```ts
// (imports and MatchPoolService omitted for brevity — enqueue/remove/getCandidates unchanged)

/**
 * Batched "which of these users are still searching" via a single MGET.
 * Replaces per-candidate `GET mm:state` round-trips that head-of-line block
 * the shared request-path Redis connection.
 */
private async fetchSearchingStates(userIds: string[]): Promise<Set<string>> {
  const searching = new Set<string>();
  if (userIds.length === 0) return searching;
  const redis = getRedis();
  const states = await redis.mget(...userIds.map((id) => redisKeys.userState(id)));
  for (let i = 0; i < userIds.length; i += 1) {
    const uid = userIds[i];
    if (uid !== undefined && states[i] === "searching") searching.add(uid);
  }
  return searching;
}

/**
 * Filters an ordered candidate list down to unblocked, still-searching peers,
 * preserving input order and stopping at `batchSize`. Uses two batched Redis
 * round-trips (block sets + state MGET) instead of two per candidate.
 */
private async filterCandidates(
  requesterId: string,
  ordered: MatchCandidate[],
  batchSize: number,
): Promise<MatchCandidate[]> {
  if (ordered.length === 0) return [];
  const ids = ordered.map((c) => c.userId);
  const [blocked, searching] = await Promise.all([
    filterBlockedPeers(requesterId, ids),   // ONE pipelined round-trip for all
    this.fetchSearchingStates(ids),         // ONE MGET for all
  ]);
  const out: MatchCandidate[] = [];
  for (const c of ordered) {
    if (blocked.has(c.userId) || !searching.has(c.userId)) continue;
    out.push(c);
    if (out.length >= batchSize) break;
  }
  return out;
}

private async collectFromZset(
  requesterId: string,
  key: string,
  scanLimit: number,
  batchSize: number,
): Promise<MatchCandidate[]> {
  const redis = getRedis();
  const rows = await redis.zrevrange(key, 0, scanLimit - 1, "WITHSCORES");
  const ordered: MatchCandidate[] = [];
  for (let i = 0; i < rows.length; i += 2) {
    const userId = rows[i];
    const scoreRaw = rows[i + 1];
    if (!userId || !scoreRaw || userId === requesterId) continue;
    ordered.push({ userId, score: Number(scoreRaw) });
  }
  return this.filterCandidates(requesterId, ordered, batchSize);
}

private async mergePrimaryThenGlobal(
  requesterId: string,
  primaryRows: MatchCandidate[],
): Promise<MatchCandidate[]> {
  const redis = getRedis();
  const batchSize = MATCH_CONFIG.candidateBatchSize;
  const seen = new Set<string>();

  // Ordered primary-then-global candidate list, deduped, requester excluded.
  const ordered: MatchCandidate[] = [];
  const pushUnique = (c: MatchCandidate): void => {
    if (c.userId === requesterId || seen.has(c.userId)) return;
    seen.add(c.userId);
    ordered.push(c);
  };

  for (const c of primaryRows) pushUnique(c);

  const globalRows = await redis.zrevrange(
    redisKeys.poolGlobal(),
    0,
    MATCH_CONFIG.poolScanLimit - 1,
    "WITHSCORES",
  );
  for (let i = 0; i < globalRows.length; i += 2) {
    const userId = globalRows[i];
    const scoreRaw = globalRows[i + 1];
    if (!userId || !scoreRaw) continue;
    pushUnique({ userId, score: Number(scoreRaw) });
  }

  return this.filterCandidates(requesterId, ordered, batchSize);
}

private async collectGlobalForeignFirst(
  requesterId: string,
  requesterSnapshot: SnapshotUserProfile,
): Promise<MatchCandidate[]> {
  const redis = getRedis();
  const fetchCap = MATCH_CONFIG.poolGlobalSortFetch;
  const batchSize = MATCH_CONFIG.candidateBatchSize;
  const rows = await redis.zrevrange(redisKeys.poolGlobal(), 0, fetchCap - 1, "WITHSCORES");

  type Row = MatchCandidate & { sortGroup: number };
  const parsed: Row[] = [];
  for (let i = 0; i < rows.length; i += 2) {
    const userId = rows[i];
    const scoreRaw = rows[i + 1];
    if (!userId || !scoreRaw || userId === requesterId) continue;
    parsed.push({ userId, score: Number(scoreRaw), sortGroup: 1 });
  }

  // Single batched block-set check instead of one round-trip per candidate.
  const blocked = await filterBlockedPeers(requesterId, parsed.map((p) => p.userId));
  const pending = parsed.filter((p) => !blocked.has(p.userId));

  const ids = pending.map((p) => p.userId);
  const ccMap = await peekCountryCodesByUserIds(ids);   // already batched (one MGET)
  const home =
    normalizeCountryCode(/* filters.countryCode */ "") ??
    normalizeCountryCode(/* attributes.countryCode */ "");

  for (const p of pending) {
    const peerCc = ccMap.get(p.userId) ?? null;
    p.sortGroup = !home || !peerCc || peerCc === home ? 1 : 0;   // foreign-first = group 0
  }

  pending.sort((a, b) => {
    if (a.sortGroup !== b.sortGroup) return a.sortGroup - b.sortGroup;
    return b.score - a.score;
  });

  // Single batched state MGET instead of one GET per candidate.
  const searching = await this.fetchSearchingStates(pending.map((p) => p.userId));
  const out: MatchCandidate[] = [];
  for (const p of pending) {
    if (out.length >= batchSize) break;
    if (!searching.has(p.userId)) continue;
    out.push({ userId: p.userId, score: p.score });
  }
  return out;
}
```

### The one-line essence of Fix A

**Before** (inside every selection method):

```ts
for (const candidate of rows) {
  if (await isBlockedWithPeer(requesterId, candidate)) continue;  // round-trip per item
  const state = await redis.get(userState(candidate));           // round-trip per item
  ...
}
```

**After**:

```ts
const [blocked, searching] = await Promise.all([
  filterBlockedPeers(requesterId, ids),   // one round-trip for ALL
  this.fetchSearchingStates(ids),         // one round-trip for ALL
]);
for (const c of ordered) { if (blocked.has(c.userId) || !searching.has(c.userId)) continue; ... }
```

Two round-trips **total** instead of two **per candidate**.

---

## Appendix C — `src/shared/config/env.ts` (the new knob)

One line added so the pool size is configurable (defaults to 4):

```ts
/** Number of independent request-path Redis sockets. A stall on one socket
 * can only head-of-line block commands routed to that socket, not all of them. */
redisPoolSize: getNumberEnv(process.env.REDIS_POOL_SIZE, 4),
```

Set `REDIS_POOL_SIZE` in the environment to tune it (remember: each pod opens
`REDIS_POOL_SIZE + 1` connections, the `+1` being the blocking client).
