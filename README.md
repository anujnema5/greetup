# circlo

Monorepo for Circlo application services.

This repository currently contains:

- `client`: Next.js frontend
- `server`: main API + auth + realtime backend
- `match-engine`: dedicated async matchmaking service (Redis-based)
- `docs`: architecture and developer notes

## Architecture at a glance

High-level request flow:

1. User interacts on `client`
2. `server` handles app APIs/auth/realtime
3. For matchmaking, `server` calls `match-engine`
4. `match-engine` computes match state (`searching`, `matched`, `no_match`)
5. `server` orchestrates next actions (for example media room setup) and notifies frontend

Data and infra:

- PostgreSQL: primary app data store
- Redis: cache/presence/match state/locks/queues

## Repository structure

```txt
circlo/
  client/          # Next.js app
  server/          # Hono/Node backend
  match-engine/    # Bun matchmaking microservice
  docs/            # Design + dev docs
  docker-compose.dev.yml
```

## Prerequisites

- Node.js + npm (for `client` and `server`)
- Bun (for `match-engine`)
- Docker Desktop (recommended for Postgres and Redis locally)

## Quick start (recommended)

Run DB dependencies in Docker, apps on host for better local DX.

### 1) Start dependencies

From repo root:

```bash
docker compose -f docker-compose.dev.yml up -d postgres redis
```

Default exposed ports:

- Postgres: `localhost:25432`
- Redis: `localhost:16379`

### 2) Start backend (`server`)

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

By convention, backend runs on:

- `http://localhost:5050`

### 3) Start frontend (`client`)

```bash
cd client
npm install
npm run dev
```

Frontend:

- `http://localhost:3000`

### 4) Start matchmaking service (`match-engine`)

```bash
cd match-engine
bun install
bun run dev
```

Default host/port come from `match-engine/env/.env.*`.

## Full Docker option

To run app services in Docker too:

```bash
docker compose -f docker-compose.dev.yml --profile app up --build
```

Use this when you want container parity; local host-run is usually faster for dev iteration.

## Service-level docs

- `client/README.md`
- `server/README.md`
- `match-engine/README.md`

## Match-engine API summary

`match-engine` is asynchronous:

- `POST /match/find` -> immediate `searching` ack
- `GET /match/result/:requestId` -> polling endpoint for final state

Final result variants:

- `matched` (includes `peerUserId`, `matchScore`)
- `no_match`

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

## Environment files

- `server/.env.example`
- `match-engine/env/.env.example`

Create local `.env` files before starting services and fill required secrets.

## Additional docs

- `docs/DEV.md` - developer setup details
- `docs/MATCHING_SYSTEM_DESIGN.md` - matching design notes

## Notes

- Keep `requestId` unique per matchmaking attempt for idempotency.
- Prefer backend orchestration for downstream room/video setup.
