# circlo

Monorepo for Circlo application services.

## Services

| Service | Tech | Role |
|---|---|---|
| `client` | Next.js | Frontend app |
| `server` | Hono / Node.js | Main API, auth, realtime orchestration |
| `match-engine` | Bun | Async matchmaking microservice |
| `media-server` | Node.js + mediasoup | WebRTC SFU for peer video/audio |
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
│   SERVER (Hono/Node)   │           │  MEDIA-SERVER (mediasoup)  │
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
│  MATCH-ENGINE (Bun)    │
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
2.  server           → POST /match/find          → match-engine
3.  match-engine scores candidates, writes result to Redis
4.  match-engine     → webhook (matched event)   → server
5.  server creates a media room, notifies both clients via WebSocket
6.  Both clients     → negotiate WebRTC transports with media-server (SFU)
7.  media-server relays audio/video between peers (no peer-to-peer)
```

### Why SFU (mediasoup)?

A Selective Forwarding Unit receives each peer's media stream once and forwards it to other participants without decoding. This is more scalable than a full mesh (peer-to-peer) and cheaper on CPU than an MCU (transcoding). mediasoup runs natively on Node.js with no external media dependencies.

---

## Repository structure

```
circlo/
  client/               # Next.js app
  server/               # Hono/Node backend
  match-engine/         # Bun matchmaking microservice
  media-server/         # mediasoup SFU (planned)
  docs/                 # Design + dev docs
  docker-compose.dev.yml
```

---

## Prerequisites

- Node.js + npm (for `client`, `server`, `media-server`)
- Bun (for `match-engine`)
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
cp .env.example .env
npm install
npm run dev
# → http://localhost:5050
```

### 3) Start client

```bash
cd client
npm install
npm run dev
# → http://localhost:3000
```

### 4) Start match-engine

```bash
cd match-engine
bun install
bun run dev
```

Config comes from `match-engine/env/.env.*`.

### 5) Start media-server (once implemented)

```bash
cd media-server
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

## Match-engine API

`match-engine` is fully async:

| Endpoint | Description |
|---|---|
| `POST /match/find` | Enqueue a match request → returns `searching` ack immediately |
| `GET /match/result/:requestId` | Poll for final state |

Final states: `matched` (includes `peerUserId`, `matchScore`) or `no_match`.

---

## Media-server (mediasoup SFU)

Planned endpoints (server-to-media-server, internal):

| Endpoint | Description |
|---|---|
| `POST /rooms` | Create a new media room |
| `POST /rooms/:roomId/transports` | Create a WebRTC transport for a peer |
| `POST /rooms/:roomId/producers` | Publish a media track |
| `POST /rooms/:roomId/consumers` | Subscribe to a peer's track |
| `DELETE /rooms/:roomId` | Tear down a room |

Clients connect directly to `media-server` for WebRTC signalling after `server` provisions the room.

---

## Useful scripts

### `server`
- `npm run dev`
- `npm run db:generate`
- `npm run db:migrate`
- `npm run db:seed`

### `client`
- `npm run dev`
- `npm run build`
- `npm run lint`

### `match-engine`
- `bun run dev`
- `bun run typecheck`
- `bun run test`
- `bun run stress`

---

## Environment files

- `server/.env.example`
- `match-engine/env/.env.example`

Create local `.env` files before starting services and fill required secrets.

---

## Additional docs

- `docs/DEV.md` — developer setup details
- `docs/MATCHING_SYSTEM_DESIGN.md` — matching design notes

---

## Notes

- Keep `requestId` unique per matchmaking attempt for idempotency.
- `server` is the single orchestrator — it owns the lifecycle of rooms and notifies clients. Neither `match-engine` nor `media-server` talk to the client directly.
- `media-server` will require native build tooling (Python, C++ build tools) for mediasoup worker binaries.
