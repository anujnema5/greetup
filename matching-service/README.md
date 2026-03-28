# matching-service

Redis-backed Bun service for async user matchmaking with weighted scoring.

This service is responsible for:

- Accepting matchmaking requests quickly
- Running candidate selection in background workers
- Returning match state (`searching`, `matched`, `no_match`)
- Producing a deterministic `matchScore` for each successful match

It is intentionally focused on matchmaking only. Video room setup should be orchestrated by backend/media services.

## Core behavior

### Async flow (current)

1. Backend calls `POST /match/find` with `{ userId, requestId }`
2. Service validates request and snapshot availability
3. Attempt state is marked as `searching`
4. Request is queued (`mm:jobs:find`) for background processing
5. API returns immediately with `searching`
6. Worker processes queued request and updates final attempt state
7. Backend polls `GET /match/result/:requestId` until final state

### Match decision

A candidate is considered only if:

- Shared `matchIds` exist
- Bidirectional hard compatibility passes (age range, distance, connection type overlap)
- Weighted score meets threshold

Then candidates are ranked by:

1. `matchScore` descending
2. pool score descending (tie-breaker)

### Soft preference

`preferredGender` is a score boost, not a hard rejection condition.

## API

### `GET /health`

Health check endpoint.

### `POST /match/find`

Starts async matchmaking and returns immediately.

Request:

```json
{ "userId": "u1", "requestId": "attempt-123" }
```

Response:

- `{ "status": "searching", "retryAfterMs": 1000 }` (normal)
- If same `requestId` is already completed, it may return final status directly

### `GET /match/result/:requestId`

Fetches current attempt status.

Response variants:

- `{ "status": "searching", "retryAfterMs": 1000 }`
- `{ "status": "matched", "roomId": "...", "peerUserId": "...", "matchScore": 82 }`
- `{ "status": "no_match", "reason": "..." }`

## Match score model

Configured in `src/config/constants.ts` under `MATCH_SCORE_CONFIG`.

Current weighted signals:

- interests
- goals
- connectionTypes
- professions
- agePreference
- distancePreference
- preferredGender (soft boost)
- trustScore

Scores are normalized to `0..100` and compared against `minScoreToMatch`.

## Redis data model (high-level)

- `user:profile:snapshot:{userId}` - parsed user snapshot input
- `mm:pool:global` - searchable user pool (sorted set)
- `mm:state:{userId}` - `free | searching | locked | in_room`
- `mm:attempt:{requestId}` - attempt state and outcome
- `mm:lock:user:{userId}` - per-user lock
- `mm:pair:lock:{low}:{high}` - pair lock
- `mm:jobs:find` - background job queue (list)

## Room creation mode

Room creation is currently supported in two modes:

- `MATCHING_ROOM_MODE=mock` (default): deterministic mock room id
- `MATCHING_ROOM_MODE=http` with `ROOM_SERVICE_URL`: calls `POST {ROOM_SERVICE_URL}/rooms/match`

For production architecture, prefer backend/media orchestration ownership for room lifecycle.

## Local setup

### Prerequisites

- Bun
- Redis

### Run

```bash
bun run dev
```

### Scripts

- `bun run dev` - start in watch mode
- `bun run start` - start once
- `bun run typecheck` - TypeScript checks
- `bun run test` - unit tests
- `bun run stress` - stress scenario runner

## Environment

See `env/.env.example` and `env/.env.development`.

Important variables:

- `MATCHING_HOST`
- `MATCHING_PORT`
- `REDIS_URL`
- `MATCHING_ROOM_MODE`
- `ROOM_SERVICE_URL`

## Stress testing

Run:

```bash
bun run stress
```

Optional env overrides:

- `STRESS_BASE_URL` (default `http://localhost:8000`)
- `STRESS_USERS` (default `30`)
- `STRESS_ROUNDS` (default `3`)
- `STRESS_GROUP_SIZE` (default `3`)
- `STRESS_NEW_USERS_MIN` (default `2`)
- `STRESS_NEW_USERS_MAX` (default `6`)

The stress runner now:

- validates service reachability before run
- starts match requests
- polls `/match/result/:requestId` for final status
- reports round-level and aggregate match score metrics

## Recommended integration pattern

- Frontend -> Backend: start matching
- Backend -> Matching service: `POST /match/find`
- Backend -> Matching service: poll `GET /match/result/:requestId`
- On `matched`, backend orchestrates media room creation
- Backend notifies frontend via websocket/SSE

## Project structure

```txt
matching-service/
  src/
    app.ts
    config/
      env.ts
      constants.ts
      load-env.ts
    contracts/
      matchmaking.contracts.ts
    core/
      logger.ts
    http/
      health.route.ts
      matchmaking.route.ts
    matchmaking/
      index.ts
      application/
        match-orchestrator.service.ts
        match-worker.service.ts
      domain/
        match-score.service.ts
        match-score.service.test.ts
        match-validator.service.ts
        match-validator.service.test.ts
        matching.types.ts
      infrastructure/
        parsers/
          snapshot.parser-utils.ts
        repositories/
          match-attempt.repository.ts
          snapshot.repository.ts
        services/
          match-job-queue.service.ts
          match-lock.service.ts
          match-pool.service.ts
          room-orchestration.service.ts
    redis/
      client.ts
      keys.ts
      scripts.ts
  scripts/
    stress-match.ts
  MATCHING_SERVICE_PLAN.md
```

## Notes

- `requestId` should be unique per matchmaking attempt for idempotency.
- Current result-delivery model is backend polling; event push via Redis Streams can be added as next step.
