# Guest call trial module (server)

Isolated feature module for **one free direct video call** before signup. Other modules integrate only through this module’s **public exports** (`index.ts`) — do not import guest internals from matching, rooms, or profile.

Mirrors client layout: `client/src/features/guest-trial/`.

## Principles

1. **Separate module** — guest trial logic stays here; cross-module hooks call exported services only.
2. **Thin controllers** — HTTP handlers validate input and delegate to services.
3. **Repositories = Postgres only** — no Redis or business rules in repositories.
4. **Redis in `lib/`** — abuse / rate-limit keys (`guest-trial-redis.ts`), same pattern as `blocks/lib/user-blocks-redis.ts`.
5. **One service per use case** — consume trial, status, audit log, abuse checks are separate files.
6. **Auth plugin stays in `core/auth/plugins/`** — it calls this module’s services; it does not own guest business logic.

## Folder map

| Folder | Purpose |
|--------|---------|
| `controllers/` | HTTP handlers (`/guest/*`) |
| `router.ts` | Hono route wiring |
| `repositories/` | Drizzle access (`guest-profile`, `guest-trial-events`) |
| `schemas/` | Zod request bodies |
| `middleware/` | Trial guards + block guests from full-app route trees |
| `services/trial/` | Call trial consume + availability |
| `services/status/` | Guest flow status (`nextStep`, `canStartMatch`) |
| `services/audit/` | Append-only `guest_trial_events` |
| `services/abuse/` | Device/IP limits (Redis) |
| `services/session/` | Guest user factory, signup detection + merge (Steps 20–21) |
| `services/auth/` | `resolveGuestAuthContext` for HTTP middleware |
| `lib/` | Hashing, Redis helpers, small pure utils |
| `socket/` | Real-time emits (`guest:trial_consumed`) |
| `constants/events/` | Socket event names (sync with client when built) |
| `types/` | Module DTOs |
| `constants/` | Limits shared across services |

## Integration points (other modules)

| Consumer | Calls |
|----------|--------|
| `core/auth/plugins/guest-session.plugin.ts` | `createGuestSession` (`POST /api/auth/guest`) |
| `modules/matching` | `assertGuestReadyForMatchSearch`, `assertGuestCallTrialAvailable`, `logGuestTrialEvent`; pool policy via `GUEST_MATCH_POOL` (see architecture §6.1) |
| `modules/rooms` (`join`, `issue-rtc-token`, match create) | `assertGuestMayAccessRoom`, `consumeGuestCallTrial`, `includesGuestParticipant`, `computeGuestMatchRoomSessionExpiresAt` |
| `modules/profile` (guest match-prep) | `logGuestTrialEvent` only |

## Product doc

`docs/temp/guest-trial-architecture.md`
