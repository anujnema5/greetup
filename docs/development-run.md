# Developer Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Overview](#overview)
3. [Prerequisites](#prerequisites)
4. [Repository Structure](#repository-structure)
5. [Local Setup (Recommended)](#local-setup-recommended)
6. [Environment Variables](#environment-variables)
7. [Service Reference](#service-reference)
8. [Database](#database)
9. [Full Docker Setup](#full-docker-setup)
10. [Code Conventions](#code-conventions)
11. [Architecture & Data Flow](#architecture--data-flow)
12. [Security Model](#security-model)

---

## Getting Started

A complete walkthrough from zero to all four services running locally.

### 1. Install tools

**Bun** (server, client, matching-service):

```bash
curl -fsSL https://bun.sh/install | bash
```

**Node.js** — install the current LTS from [nodejs.org](https://nodejs.org). Required only for `rtc-service`.

**Docker Desktop** — [docs.docker.com/get-docker](https://docs.docker.com/get-docker). Used to run Postgres and Redis locally without installing them.

> **Windows only (rtc-service):** mediasoup compiles a native binary at install time. You need Python and C++ build tools. Run this in an elevated PowerShell, then restart your terminal:
> ```powershell
> npm install --global windows-build-tools
> ```
> Or install the "Desktop development with C++" workload from [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022) and ensure Python is on PATH.

---

### 2. Clone and enter the repo

```bash
git clone <repo-url> greetup
cd greetup
```

---

### 3. Start infrastructure (Postgres + Redis)

```bash
docker compose -f docker-compose.dev.yml up -d postgres redis
```

Verify they are up:

```bash
docker ps
# greetup_postgres   0.0.0.0:25432->5432/tcp
# greetup_redis      0.0.0.0:16379->6379/tcp
```

---

### 4. Set up and start the server

```bash
cd server
cp env/.env.example env/.env.development
```

Open `server/env/.env.development` and fill in the required values:

```env
PORT=5300
DATABASE_URL=postgresql://postgres:postgres@localhost:25432/greetup_db
REDIS_URL=redis://localhost:16379
BETTER_AUTH_URL=http://localhost:5300
BETTER_AUTH_SECRET=change_me_to_a_random_32_char_string
WEB_CLIENT_HOST=http://localhost:3000
SERVER_URL=http://localhost:5300
INTERNAL_API_KEY=change_me_to_a_shared_secret
MATCH_ENGINE_URL=http://localhost:4020
RTC_JWT_SECRET=change_me_min_16_chars
```

Then install, migrate, and run:

```bash
bun install
bun run db:migrate     # creates tables on first run
bun run db:seed        # optional: seed sample data
bun run dev
# → http://localhost:5300
```

Leave this terminal running.

---

### 5. Set up and start the client

Open a new terminal:

```bash
cd client
bun install
bun run dev
# → http://localhost:3000
```

Leave this terminal running.

---

### 6. Set up and start the matching service

Open a new terminal:

```bash
cd matching-service
cp env/.env.example env/.env.development
```

Open `matching-service/env/.env.development` and set:

```env
MATCHING_PORT=4020
REDIS_URL=redis://localhost:16379
INTERNAL_API_KEY=change_me_to_a_shared_secret   # same value as server
MATCH_WEBHOOK_URL=http://localhost:5300/internal/webhook/match-completed
MATCHING_ROOM_MODE=mock
```

Then:

```bash
bun install
bun run dev
# → http://localhost:4020
```

Leave this terminal running.

---

### 7. Set up and start the RTC service

Open a new terminal:

```bash
cd rtc-service
```

Create `rtc-service/.env` (or `rtc-service/env/.env.development` if that path is used) with:

```env
RTC_PORT=5370
WEBRTC_LISTEN_IP=0.0.0.0
WEBRTC_ANNOUNCED_IP=127.0.0.1
INTERNAL_API_KEY=change_me_to_a_shared_secret   # same value as server
RTC_JWT_SECRET=change_me_min_16_chars           # same value as server
```

Then:

```bash
npm install    # uses npm — mediasoup requires native compilation
npm run dev
# → http://localhost:5370
```

---

### 8. Verify everything is running

| Service | URL | Quick check |
|---|---|---|
| client | `http://localhost:3000` | Should load the app UI |
| server | `http://localhost:5300` | `curl http://localhost:5300/health` → `200` |
| matching-service | `http://localhost:4020` | `curl http://localhost:4020/health` → `200` |
| rtc-service | `http://localhost:5370` | `curl http://localhost:5370/health` → `200` |

You now have the full stack running. Keep all four terminals open while developing.

---

### Terminal layout (quick reference)

```
Terminal 1 (infra)     docker compose -f docker-compose.dev.yml up -d postgres redis
Terminal 2 (server)    cd server && bun run dev
Terminal 3 (client)    cd client && bun run dev
Terminal 4 (matching)  cd matching-service && bun run dev
Terminal 5 (rtc)       cd rtc-service && npm run dev
```

---

## Overview

Greetup is a monorepo with four services:

| Service | Runtime | Port | Role |
|---|---|---|---|
| `client` | Bun / Next.js | 3000 | Frontend |
| `server` | Bun / Hono | 5300 | Main API, auth, WebSocket |
| `matching-service` | Bun / Hono | 4020 | Async matchmaking |
| `rtc-service` | Node.js + mediasoup | 5370 | WebRTC SFU |

Infrastructure: **PostgreSQL** on `localhost:25432`, **Redis** on `localhost:16379`.

---

## Prerequisites

| Tool | Required by | Notes |
|---|---|---|
| [Bun](https://bun.sh) | `server`, `client`, `matching-service` | Check `packageManager` in each `package.json` for exact version |
| Node.js (LTS) | `rtc-service` | mediasoup requires native builds |
| Docker Desktop | All (for Postgres & Redis) | Alternatives: local Postgres/Redis |
| Python + C++ build tools | `rtc-service` | Required by mediasoup worker compilation |

Install Bun:

```bash
curl -fsSL https://bun.sh/install | bash
```

---

## Repository Structure

```
greetup/
  client/                     # Next.js app
    src/
      app/                    # App Router routes and layouts
      features/<feature>/     # Feature slices (api/, components/, hooks/, types/)
      lib/                    # Shared utilities, RTK Query base
      shared/                 # Cross-cutting constants, env helpers
  server/                     # Hono/Bun API
    src/
      modules/<feature>/      # Vertical slices (controllers/, services/, repositories/)
      core/                   # Database, auth, socket setup
      middleware/             # auth, error, internal middleware
      shared/                 # User-facing API messages
    env/                      # .env.example and .env.development
  matching-service/           # Bun matchmaking microservice
    src/
      config/                 # env, constants
      matchmaking/            # domain, application, infrastructure layers
      redis/                  # client, keys, Lua scripts
    scripts/                  # stress-match.ts
    env/
  rtc-service/                # mediasoup SFU
    src/
      rooms/, peers/, signaling/, mediasoup/, auth/
    env/
  docs/                       # Design and developer notes
  docker-compose.dev.yml
```

---

## Local Setup (Recommended)

Run Postgres and Redis in Docker; run each app service locally for fast hot reload.

### Step 1 — Start infrastructure

From the repo root:

```bash
docker compose -f docker-compose.dev.yml up -d postgres redis
```

| Service | Local address | Credentials |
|---|---|---|
| PostgreSQL | `localhost:25432` | `postgres` / `postgres` / DB: `greetup_db` |
| Redis | `localhost:16379` | none |

### Step 2 — Server

```bash
cd server
cp env/.env.example env/.env.development   # first time only
# Edit env/.env.development — fill in DATABASE_URL, REDIS_URL, and secrets (see below)
bun install
bun run db:migrate     # apply schema migrations (required on first run and after pulls)
bun run dev
# → http://localhost:5300
```

Optional: seed the database after migrating:

```bash
bun run db:seed              # full seed
bun run db:seed:dev-users    # dev users only
```

### Step 3 — Client

```bash
cd client
cp .env.example .env.local   # if it exists; or create .env.local manually
bun install
bun run dev
# → http://localhost:3000
```

### Step 4 — Matching Service

```bash
cd matching-service
cp env/.env.example env/.env.development
# Edit env/.env.development — set REDIS_URL and INTERNAL_API_KEY
bun install
bun run dev
# → http://localhost:4020
```

### Step 5 — RTC Service

```bash
cd rtc-service
cp env/.env.example env/.env.development   # if it exists
npm install     # uses npm, not bun (mediasoup native build)
npm run dev
# → http://localhost:5370
```

> **Note:** mediasoup requires Python and C++ build tools at `npm install` time. On Windows, install the "Desktop development with C++" workload from Visual Studio Build Tools and ensure Python is on PATH.

---

## Environment Variables

### server — `server/env/.env.development`

| Variable | Example value | Purpose |
|---|---|---|
| `PORT` | `5300` | HTTP listen port |
| `LISTEN_HOST` | `0.0.0.0` | Bind address (`localhost` by default in dev) |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:25432/greetup_db` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:16379` | Redis connection string |
| `BETTER_AUTH_URL` | `http://localhost:5300` | Canonical server URL used by Better Auth |
| `BETTER_AUTH_SECRET` | _(random 32+ char string)_ | Session token signing key |
| `WEB_CLIENT_HOST` | `http://localhost:3000` | Frontend origin (CORS) |
| `SERVER_URL` | `http://localhost:5300` | Own URL for inter-service references |
| `INTERNAL_API_KEY` | _(shared secret)_ | Service-to-service auth header value |
| `MATCH_ENGINE_URL` | `http://localhost:4020` | Matching service base URL |
| `RTC_JWT_SECRET` | _(min 16 chars, shared with rtc-service)_ | JWT for Socket.IO auth with RTC |
| `GOOGLE_CLIENT_ID` | _(OAuth credential)_ | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | _(OAuth credential)_ | Google OAuth |
| `GOOGLE_MAPS_API_KEY` | _(Google Maps credential)_ | Server-side geocoding for match prep location |
| `MAILJET_API_KEY` | _(Mailjet primary API key)_ | Transactional email (Better Auth) |
| `MAILJET_API_SECRET` | _(Mailjet secret key)_ | Pair with `MAILJET_API_KEY` |
| `MAIL_FROM_EMAIL` | _(verified sender, e.g. noreply@yourdomain)_ | From address in Mailjet |
| `MAIL_FROM_NAME` | _(optional)_ | Display name (default `Greetup`) |
| `DEV_NOTIFICATION_EMAIL` | _(optional)_ | Dev email override |

### matching-service — `matching-service/env/.env.development`

| Variable | Default | Purpose |
|---|---|---|
| `NODE_ENV` | `development` | |
| `MATCHING_HOST` | `0.0.0.0` | Bind address |
| `MATCHING_PORT` | `4020` | HTTP listen port |
| `REDIS_URL` | `redis://127.0.0.1:6379` | Redis (use `localhost:16379` locally) |
| `INTERNAL_API_KEY` | _(shared secret)_ | Must match server's `INTERNAL_API_KEY` |
| `MATCHING_ROOM_MODE` | `mock` | `mock` (dev) or `http` (calls room service) |
| `ROOM_SERVICE_URL` | `http://localhost:5300` | Only used when `MATCHING_ROOM_MODE=http` |
| `MATCH_WEBHOOK_URL` | `http://localhost:5300/internal/webhook/match-completed` | Webhook target on server |

### rtc-service — `rtc-service/env/.env.development`

| Variable | Default | Purpose |
|---|---|---|
| `NODE_ENV` | `development` | |
| `RTC_HOST` | `0.0.0.0` | Bind address |
| `RTC_PORT` | `5370` | HTTP/WebSocket listen port |
| `RTC_MIN_PORT` | `40000` | UDP/TCP port range start (mediasoup) |
| `RTC_MAX_PORT` | `49999` | UDP/TCP port range end (mediasoup) |
| `WEBRTC_LISTEN_IP` | `0.0.0.0` | mediasoup listen IP |
| `WEBRTC_ANNOUNCED_IP` | `127.0.0.1` | Public/LAN IP clients use for ICE |
| `INTERNAL_API_KEY` | _(shared secret)_ | Must match server's `INTERNAL_API_KEY` |
| `RTC_JWT_SECRET` | _(min 16 chars)_ | Must match server's `RTC_JWT_SECRET` |

---

## Service Reference

### server scripts

```bash
bun run dev              # start with hot reload
bun run debug            # start with Bun inspector enabled
bun run build            # tsc compile check
bun run db:generate      # generate Drizzle migration SQL from schema changes
bun run db:migrate       # apply pending migrations
bun run db:studio        # open Drizzle Studio (visual DB browser)
bun run db:seed          # full seed
bun run db:seed:dev-users  # seed dev users only
```

### client scripts

```bash
bun run dev              # Next.js dev server
bun run build            # production build
bun run start            # serve production build
bun run lint             # ESLint
bun run typecheck        # tsc --noEmit
```

### matching-service scripts

```bash
bun run dev              # start with hot reload
bun run start            # start once
bun run typecheck        # tsc --noEmit
bun run test             # unit tests
bun run stress           # stress test against running service
```

Stress test environment overrides:

| Variable | Default |
|---|---|
| `STRESS_BASE_URL` | `http://localhost:4020` |
| `STRESS_USERS` | `30` |
| `STRESS_ROUNDS` | `3` |
| `STRESS_GROUP_SIZE` | `3` |

### rtc-service scripts

```bash
npm run dev              # start with tsx watch
npm run start            # start once
npm run typecheck        # tsc --noEmit
```

---

## Database

The `server` owns the PostgreSQL schema via **Drizzle ORM**.

### Workflow for schema changes

```bash
# 1. Edit schema files under server/src/core/database/schema/
# 2. Generate migration SQL
bun run db:generate

# 3. Review the generated .sql in server/src/core/database/migration/
# 4. Apply to running DB
bun run db:migrate
```

### Migration internals

- Migrations are tracked in `public.schema_migrations` (not Drizzle Kit's journal).
- `db:migrate` (`run-migrations.ts`) applies `migration/*.sql` files in lexical order and skips already-applied files.
- If upgrading from a DB that used the old `drizzle-kit migrate` approach, the script automatically seeds the ledger from `drizzle.__drizzle_migrations` on first run.

### Drizzle Studio (optional)

```bash
bun run db:studio
# Opens a browser-based DB explorer at http://local.drizzle.studio
```

---

## Full Docker Setup

Runs all services in containers (slower hot reload, useful for CI parity):

```bash
docker compose -f docker-compose.dev.yml --profile app up --build
```

Infrastructure only (default):

```bash
docker compose -f docker-compose.dev.yml up -d postgres redis
```

| Container | Port mapping |
|---|---|
| `greetup_postgres` | `25432:5432` |
| `greetup_redis` | `16379:6379` |
| `greetup_server` | `5300:5300` |
| `greetup_client` | `3000:3000` |

> On Windows with volume mounts, `WATCHPACK_POLLING=true` is set in the compose file to enable file watching.

---

## Code Conventions

### server

- **Module structure:** `src/modules/<feature>/` — one slice per domain feature.

  ```
  modules/<feature>/
    router.ts
    controllers/    # HTTP handlers — thin, delegate to services
    services/       # business logic
    repositories/   # Drizzle/Postgres only
    schemas/        # Zod validation schemas
    types/          # Request/response and domain types — import from here
  ```

- **Error handling:** Operational errors use typed errors or Zod — safe messages returned to the client. Unexpected failures log full detail server-side; JSON response uses `CLIENT_SAFE_INTERNAL_MESSAGE` from `src/shared/messages/`. Never return raw database errors to clients.

- **Naming:** Files use `kebab-case` (`create-circle.schema.ts`, `user.service.ts`). Types/interfaces use `PascalCase`; API payload shapes often end in `Body`, `Result`, or `Response`.

- **Middleware:**

  | Middleware | Scope | Checks |
  |---|---|---|
  | `authMiddleware` | `/api/*` | Session cookie → PostgreSQL lookup |
  | `verifiedEmailMiddleware` | Selected routes | `emailVerified` flag |
  | `premiumMiddleware` | Premium routes | `isPremium` + `premiumExpiresAt` |
  | `internalMiddleware` | `/internal/*` | `x-internal-api-key` header |

### client

- **Feature structure:** `src/features/<feature>/` — co-locate API, components, hooks, types.

  ```
  features/<feature>/
    api/            # RTK Query injectEndpoints
    components/
    hooks/
    types/          # DTOs and UI types (*-api.types.ts)
    schemas/        # Zod schemas for forms
  ```

- **Data fetching:** RTK Query endpoints in `features/<name>/api/`. Pending state flag is `isLoading` (not `isPending`).
- **Path alias:** `@/` maps to `src/`.
- **Components:** `PascalCase` files.

### matching-service

- Domain logic lives in `src/matchmaking/domain/`; infrastructure adapters (Redis repositories, job queue) in `src/matchmaking/infrastructure/`.
- `requestId` must be unique per matchmaking attempt — used for idempotency.

---

## Architecture & Data Flow

### Find a match and start a video call

```
1. Client           → POST /match/find                → server
2. server           → POST /match/find                → matching-service
3. matching-service   scores candidates, writes result to Redis
4. matching-service → POST /internal/webhook/match-completed → server
5. server           creates media room, notifies clients via WebSocket
6. Both clients     → negotiate WebRTC transports      → rtc-service
7. rtc-service        relays audio/video between peers (SFU, no P2P)
```

### WebSocket connection lifecycle

```
1. Client opens Socket.io connection (session cookie in handshake)
2. server io.use() validates session via Better Auth
3. socket.userId / socket.sessionId attached
4. Socket joins room user:{userId}
5. Heartbeat every 20s → Redis presence refreshed
```

### Matching internals (matching-service)

1. `POST /match/find` — validates request, marks state as `searching`, enqueues job to `mm:jobs:find`, returns `{ status: "searching" }` immediately.
2. Background worker processes queue, scores candidates using mutual weighted score.
3. Result written to `mm:attempt:{requestId}` in Redis.
4. Webhook fired to server on completion.
5. Server polls `GET /match/result/:requestId` or receives via webhook.

**Match score factors:** interests, goals, professions, age preference, distance, preferred gender (soft boost), trust score. Scores normalized to 0–100 and compared against `minScoreToMatch`.

**Race condition protection:** Per-user Redis lock (`mm:lock:user:{userId}`, `mm:pair:lock:{low}:{high}`) prevents two concurrent matches from claiming the same user.

---

## Security Model

### Trust boundaries

```
CLIENT  →(session cookie)→  SERVER  →(x-internal-api-key)→  MATCHING-SERVICE
                                    →(x-internal-api-key)→  RTC-SERVICE
SERVER / MATCHING-SERVICE           →(no external access)→  POSTGRES + REDIS
```

### Inter-service authentication

All service-to-service calls use the `x-internal-api-key` header. The value must match `INTERNAL_API_KEY` across `server`, `matching-service`, and `rtc-service`.

```
Server → Matching-service:
  POST /match/find               x-internal-api-key: <secret>
  GET  /match/result/:id         x-internal-api-key: <secret>

Matching-service → Server:
  POST /internal/webhook/match-completed   x-internal-api-key: <secret>
```

### Input validation

All request bodies validated with **Zod** before reaching handlers.

| Error type | Status |
|---|---|
| Zod validation error | 400 |
| JWT / session invalid | 401 |
| Email not verified | 403 |
| Rate limit exceeded | 429 |
| Internal server error | 500 (safe generic message) |

### CORS

| Service | Allowed origins |
|---|---|
| `server` | `http://localhost:3000`, `http://localhost:5300` |
| `rtc-service` | `*` (to be tightened before production) |
