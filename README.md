# greetup

Monorepo for Greetup application services.

## Services

| Service | Tech | Role |
|---|---|---|
| `apps/client` | Next.js | Frontend app |
| `apps/server` | Hono / Bun | Main API, auth, realtime orchestration |
| `apps/matching-service` | Bun | Async matchmaking microservice |
| `apps/rtc-service` | Node.js + mediasoup | WebRTC SFU for peer video/audio |
| `apps/voiceiq-service` | Bun | Voice scoring / analytics |
| `packages/shared` | TypeScript | Shared room-session types and env loader |
| `docs` | — | Architecture, developer notes, [product overview](docs/product/greetup-product-overview.md) |

---

## Architecture overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT (Next.js)                        │
│                      http://localhost:3000                        │
└────────────┬────────────────────────────────────┬───────────────┘
             │  REST / WebSocket                  │  WebRTC (SFU)
             ▼                                    ▼
┌────────────────────────┐           ┌────────────────────────────┐
│   SERVER (Hono/Bun)    │           │  RTC-SERVICE (mediasoup)   │
│   http://localhost:5300│           │  http://localhost:5370    │
│                        │           │                            │
│  - Auth (JWT/sessions) │           │  - SFU via mediasoup       │
│  - User/room APIs      │◄─────────►│  - WebRTC transport mgmt   │
│  - Match orchestration │  internal │  - Producer/consumer relay  │
│  - WebSocket gateway   │  API      │  - Room media sessions     │
│  - Webhook from match  │           │                            │
└────────────┬───────────┘           └────────────────────────────┘
             │  HTTP
             ▼
┌────────────────────────┐
│ MATCHING-SERVICE (Bun) │
│  async matchmaking     │
│                        │
│  POST /match/find      │
│  GET  /match/result/:id│
│                        │
│  1. score candidates   │
│  2. write result →     │
│     Redis              │
│  3. webhook → server   │
└────────────┬───────────┘
             │  read/write
             ▼
┌────────────────────────┐
│         REDIS          │
│   localhost:26379      │
│                        │
│  - match state/locks   │
│  - presence/cache      │
│  - queues              │
└────────────────────────┘

┌────────────────────────┐
│      PostgreSQL        │
│   localhost:25432      │
│                        │
│  - users, rooms        │
│  - match history       │
│  - app data            │
└────────────────────────┘
```

### Request flow: find a match and start a video call

```
1.  Client           → POST /match/find          → server
2.  server           → POST /match/find          → matching-service
3.  matching-service scores candidates, writes result to Redis
4.  matching-service → webhook (matched event)   → server
5.  server creates a media room, notifies both clients via WebSocket
6.  Both clients     → negotiate WebRTC transports with rtc-service (SFU)
7.  rtc-service relays audio/video between peers (no peer-to-peer)
```

### Why SFU (mediasoup)?

A Selective Forwarding Unit receives each peer's media stream once and forwards it to other participants without decoding. This is more scalable than a full mesh (peer-to-peer) and cheaper on CPU than an MCU (transcoding). mediasoup runs natively on Node.js with no external media dependencies.

---

## Security architecture

### Trust boundaries

```
┌──────────────────────────────────────────────────────────────┐
│  CLIENT (Public zone)                                        │
│  - Unauthenticated: /api/auth/* (sign-in, OAuth, verify)    │
│  - Authenticated:   /api/* (session cookie required)        │
│  - Real-time:       Socket.io (session cookie in handshake) │
└──────────────────────┬───────────────────────────────────────┘
                       │  HTTPS + session cookie
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  SERVER — Hono/Bun  (Protected zone)                          │
│  - authMiddleware:     validates session via PostgreSQL      │
│  - internalMiddleware: validates x-internal-api-key header  │
│  - /api/*      → public-facing, session-protected           │
│  - /internal/* → service-to-service only, API-key-protected │
└───────────┬────────────────────────────────┬─────────────────┘
            │  x-internal-api-key            │  x-internal-api-key
            ▼                                ▼
┌────────────────────────┐      ┌────────────────────────────┐
│ MATCHING-SERVICE (Bun) │      │  RTC-SERVICE (Node.js)     │
│  Internal network only │      │  Internal network only     │
│  Validates API key     │      │  Signaling auth: planned   │
│  Webhooks back to      │      │  WebRTC transport mgmt     │
│  server with API key   │      │                            │
└────────────────────────┘      └────────────────────────────┘
            │  read/write                    │  pub/sub
            ▼                                ▼
┌──────────────────────────────────────────────────────────────┐
│  POSTGRESQL + REDIS  (Data zone — local network only)       │
└──────────────────────────────────────────────────────────────┘
```

### Authentication flow

**User sign-in (email/password or Google OAuth)**

```
1. Client  → POST /api/auth/sign-in              → server
2. server  validates credentials via Better-Auth
3. server  creates session row in PostgreSQL (token, userId, expiresAt, IP, UA)
4. server  sets session cookie on response
5. Client  includes cookie on every subsequent request
```

**WebSocket connection**

```
1. Client  opens Socket.io connection (cookie in handshake headers)
2. server  io.use() middleware calls auth.api.getSession()
3. If no valid session → connection rejected
4. If valid → socket.userId and socket.sessionId attached
5. Socket joins room user:{userId} for targeted events
6. Heartbeat every 20 s → Redis presence refreshed
```

**Inter-service calls (server ↔ matching-service)**

```
Server → Matching-service:
  POST /match/find          Header: x-internal-api-key: <secret>
  GET  /match/result/:id    Header: x-internal-api-key: <secret>

Matching-service → Server (webhook):
  POST /internal/webhook/match-completed
                            Header: x-internal-api-key: <secret>
  Payload: { attemptId, userA, userB, roomId, matchScore, isFallbackMatch }
```

### Middleware layers

| Middleware | Route scope | What it checks |
|---|---|---|
| `authMiddleware` | `/api/*` | Session cookie → PostgreSQL lookup → attaches user to context |
| `verifiedEmailMiddleware` | Selected routes | `emailVerified` flag on user record |
| `premiumMiddleware` | Premium routes | `isPremium` flag + `premiumExpiresAt` timestamp |
| `internalMiddleware` | `/internal/*` | `x-internal-api-key` header == `INTERNAL_API_KEY` env var |

### Input validation

All request bodies are parsed with **Zod** schemas before reaching handlers. Validation errors return `400` with field-level details. The error middleware maps error types to HTTP status codes:

| Error type | Status |
|---|---|
| Zod validation error | 400 |
| JWT / session invalid | 401 |
| Email not verified | 403 |
| Rate limit exceeded | 429 |
| Internal server error | 500 (generic in production) |

### CORS policy

| Service | Allowed origins |
|---|---|
| `server` | `http://localhost:3000`, `http://localhost:5300` |
| `rtc-service` | `*` (to be tightened before production) |

### Environment secrets

| Variable | Used by | Purpose |
|---|---|---|
| `INTERNAL_API_KEY` | server, matching-service, rtc-service | Service-to-service auth |
| `BETTER_AUTH_SECRET` | server | Session token signing |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | server | Google OAuth |
| `GOOGLE_MAPS_API_KEY` | server | Server-side location geocoding |
| `DATABASE_URL` | server | PostgreSQL connection |
| `REDIS_URL` | matching-service, rtc-service | Redis connection |

---

## Repository structure

```
greetup/
  apps/
    client/               # Next.js app
    server/               # Hono/Bun backend
    matching-service/     # Bun matchmaking microservice
    rtc-service/          # mediasoup SFU
    voiceiq-service/      # Voice scoring / analytics
  packages/
    shared/               # Shared TypeScript contracts
    tsconfig/             # Shared TS base config
  docs/                   # Index: docs/README.md
  docker-compose.dev.yml
  package.json            # Bun workspaces root
```

### Code conventions

- **Server** (`apps/server/`): Feature modules under `src/modules/<name>/` use **controllers → services → repositories** for HTTP; **Drizzle/Postgres only in repositories**. Shared request/response types live in each module’s **`types/`** — import from there; services do not re-export types. User-visible **5xx** messages use shared copy from `src/shared/messages` (no raw database errors in JSON). See **`apps/server/README.md`**.
- **Client** (`apps/client/`): Feature-first layout under `src/features/<name>/` with **`api/`** (RTK Query), **`types/`**, components, hooks. See **`apps/client/README.md`**.
- **Matching** (`apps/matching-service/`): Standalone Bun service; see **`apps/matching-service/README.md`**.
- **Shared** (`packages/shared/`): Cross-app types (e.g. room session) and `load-env` helper.

---

## Prerequisites

- Bun `1.3.11` (all apps; install once from the repo root)
- Docker Desktop (recommended for Postgres and Redis locally)

---

## Quick start (recommended)

Run DB dependencies in Docker, apps on host for better local DX.

### 1) Install dependencies (repo root)

```bash
bun install
```

### 2) Start dependencies

```bash
docker compose -f docker-compose.dev.yml up -d postgres redis
```

Default exposed ports:

- Postgres: `localhost:25432`
- Redis: `localhost:26379`

### 3) Start server

```bash
cd apps/server
cp env/.env.example env/.env.development   # set DATABASE_URL and secrets
bun run db:migrate      # apply Drizzle migrations (required for a fresh DB)
bun run dev
# → http://localhost:5300
```

See **`apps/server/README.md`** for layout, repositories, and shared messages.

### 4) Start client

```bash
cd apps/client
bun run dev
# → http://localhost:3000
```

### 5) Start matching-service

```bash
cd apps/matching-service
bun run dev
```

Config comes from `apps/matching-service/env/.env.*` (see `apps/matching-service/README.md`).

### 6) Start rtc-service

```bash
cd apps/rtc-service
bun run dev
# → http://localhost:5370
```

Or from the repo root: `bun run dev` (starts server, client, matching, and rtc in parallel).
On Windows you can also use `start-dev.bat`.

---

## Full Docker option

```bash
docker compose -f docker-compose.dev.yml --profile app up --build
```

---

## Matching-service API

`matching-service` is fully async:

| Endpoint | Description |
|---|---|
| `POST /match/find` | Enqueue a match request → returns `searching` ack immediately |
| `GET /match/result/:requestId` | Poll for final state |

Final states: `matched` (includes `peerUserId`, `matchScore`) or `no_match`.

---

## RTC-service (mediasoup SFU)

Planned endpoints (server-to-rtc-service, internal):

| Endpoint | Description |
|---|---|
| `POST /rooms` | Create a new media room |
| `POST /rooms/:roomId/transports` | Create a WebRTC transport for a peer |
| `POST /rooms/:roomId/producers` | Publish a media track |
| `POST /rooms/:roomId/consumers` | Subscribe to a peer's track |
| `DELETE /rooms/:roomId` | Tear down a room |

Clients connect directly to `rtc-service` for WebRTC signalling after `server` provisions the room.

---

## Useful scripts

### `server`
- `bun run dev`
- `bun run db:generate`
- `bun run db:migrate`
- `bun run db:seed`

### `client`
- `bun run dev`
- `bun run build`
- `bun run lint`

### `matching-service`
- `bun run dev`
- `bun run typecheck`
- `bun run test`
- `bun run stress`

---

## Environment files

- `apps/server/env/.env.example`
- `apps/matching-service/env/.env.example`

Create local `.env` files before starting services and fill required secrets.

---

## Contributing

See **[CONTRIBUTING.md](CONTRIBUTING.md)** (AI-assisted workflow, review expectations, security).

## Additional docs

Index: **`docs/README.md`**.

- **`docs/getting-started/development-run.md`** — local dev (Docker, env, running services)
- **`docs/design/matching-system-design.md`** — matching design notes

---

## Notes

- Keep `requestId` unique per matchmaking attempt for idempotency.
- `server` is the single orchestrator — it owns the lifecycle of rooms and notifies clients. Neither `matching-service` nor `rtc-service` talk to the client directly.
- `rtc-service` will require native build tooling (Python, C++ build tools) for mediasoup worker binaries.
