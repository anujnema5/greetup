# matching-service

Separate Bun service for Redis-based matchmaking.

## Run

```bash
bun run dev
```

## Available scripts

- `bun run dev` - start service in watch mode
- `bun run start` - start service once
- `bun run typecheck` - run TypeScript checks
- `bun run test` - run unit tests

## API

- `GET /health`
- `POST /match/find`
  - body: `{ "userId": "u1", "requestId": "attempt-123" }`
  - returns:
    - `{ status: "matched", roomId, peerUserId }`
    - `{ status: "searching", retryAfterMs }`
    - `{ status: "no_match", reason }`

## Room orchestration mode

- `MATCHING_ROOM_MODE=mock` (default): returns deterministic mock room id
- `MATCHING_ROOM_MODE=http` + `ROOM_SERVICE_URL`: calls `POST {ROOM_SERVICE_URL}/rooms/match`

## Stress testing

- `bun run stress`
- optional envs:
  - `STRESS_BASE_URL` (default `http://127.0.0.1:8000`)
  - `STRESS_USERS` (initial users, default `30`)
  - `STRESS_ROUNDS` (default `3`)
  - `STRESS_GROUP_SIZE` (default `3`)
  - `STRESS_NEW_USERS_MIN` (default `2`)
  - `STRESS_NEW_USERS_MAX` (default `6`)
- round output glossary:
  - `eligible_at_start`: only users who can be requested this round (`free/searching/unknown`)
  - `skipped_in_room`: users already in room, not requested again
  - `matched_this_round`: requests that ended as matched
  - `no_match_eligible_end`: from eligible users, those still not `in_room` at round end
  - `ever_matched_users`: users who have reached `in_room` at least once since stress run started
  - `never_matched_users`: users currently in system who have not reached `in_room` yet
  - `available_now`: current real-time available users (`free + searching`)

## Current structure

```txt
matching-service/
  src/
    app.ts
    config/
      env.ts
      constants.ts
    contracts/
      matchmaking.contracts.ts
    core/
      logger.ts
    http/
      health.route.ts
    matchmaking/
      index.ts
      application/
        match-orchestrator.service.ts
      domain/
        match-validator.service.ts
        matching.types.ts
      infrastructure/
        parsers/
          snapshot.parser-utils.ts
        repositories/
          snapshot.repository.ts
        services/
          match-lock.service.ts
          match-pool.service.ts
    redis/
      client.ts
      keys.ts
      scripts.ts
  MATCHING_SERVICE_PLAN.md
```
