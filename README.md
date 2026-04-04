# circlo

Monorepo for Circlo application services.

## Services

| Service | Tech | Role |
|---|---|---|
| `client` | Next.js | Frontend app |
| `server` | Hono / Bun | Main API, auth, realtime orchestration |
| `matching-service` | Bun | Async matchmaking microservice |
| `rtc-service` | Node.js + mediasoup | WebRTC SFU for peer video/audio |
| `docs` | — | Architecture and developer notes |

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
│   http://localhost:5050│           │  http://localhost:3001      │
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
│   localhost:16379      │
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
| `server` | `http://localhost:3000`, `http://localhost:5050` |
| `rtc-service` | `*` (to be tightened before production) |

### Environment secrets

| Variable | Used by | Purpose |
|---|---|---|
| `INTERNAL_API_KEY` | server, matching-service, rtc-service | Service-to-service auth |
| `BETTER_AUTH_SECRET` | server | Session token signing |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | server | Google OAuth |
| `DATABASE_URL` | server | PostgreSQL connection |
| `REDIS_URL` | matching-service, rtc-service | Redis connection |

---

## Repository structure

```
circlo/
  client/               # Next.js app
  server/               # Hono/Bun backend
  matching-service/     # Bun matchmaking microservice
  rtc-service/          # mediasoup SFU
  docs/                 # Design + dev docs
  docker-compose.dev.yml
```

### Code conventions

- **Server** (`server/`): Feature modules under `src/modules/<name>/` use **controllers → services → repositories** for HTTP; **Drizzle/Postgres only in repositories**. Shared request/response types live in each module’s **`types/`** — import from there; services do not re-export types. User-visible **5xx** messages use shared copy from `src/shared/messages` (no raw database errors in JSON). See **`server/README.md`**.
- **Client** (`client/`): Feature-first layout under `src/features/<name>/` with **`api/`** (RTK Query), **`types/`**, components, hooks. See **`client/README.md`**.
- **Matching** (`matching-service/`): Standalone Bun service; see **`matching-service/README.md`**.

---

## Prerequisites

- Bun (for `server`, `matching-service`)
- Node.js + npm (for `client`, `rtc-service`)
- Docker Desktop (recommended for Postgres and Redis locally)

---

## Quick start (recommended)

Run DB dependencies in Docker, apps on host for better local DX.

### 1) Start dependencies

```bash
docker compose -f docker-compose.dev.yml up -d postgres redis
```

Default exposed ports:

- Postgres: `localhost:25432`
- Redis: `localhost:16379`

### 2) Start server

```bash
cd server
cp env/.env.example env/.env.development   # set DATABASE_URL and secrets
bun install
bun run db:migrate      # apply Drizzle migrations (required for a fresh DB)
bun run dev
# → http://localhost:5050
```

See **`server/README.md`** for layout, repositories, and shared messages.

### 3) Start client

```bash
cd client
npm install
npm run dev
# → http://localhost:3000
```

### 4) Start matching-service

```bash
cd matching-service
bun install
bun run dev
```

Config comes from `matching-service/env/.env.*` (see `matching-service/README.md`).

### 5) Start rtc-service

```bash
cd rtc-service
npm install
npm run dev
# → http://localhost:3001
```

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
- `npm run dev`
- `npm run build`
- `npm run lint`

### `matching-service`
- `bun run dev`
- `bun run typecheck`
- `bun run test`
- `bun run stress`

---

## Environment files

- `server/env/.env.example`
- `matching-service/env/.env.example`

Create local `.env` files before starting services and fill required secrets.

---

## Additional docs

- `docs/DEV.md` — developer setup details
- `docs/MATCHING_SYSTEM_DESIGN.md` — matching design notes

---

## Notes

- Keep `requestId` unique per matchmaking attempt for idempotency.
- `server` is the single orchestrator — it owns the lifecycle of rooms and notifies clients. Neither `matching-service` nor `rtc-service` talk to the client directly.
- `rtc-service` will require native build tooling (Python, C++ build tools) for mediasoup worker binaries.
