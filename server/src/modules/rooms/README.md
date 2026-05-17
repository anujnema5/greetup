# Rooms module (server)

HTTP + lifecycle for direct calls and circles. Mirrors the client `features/room` layout: group by **concern**, not by file type only.

## Folder map

| Folder | Purpose |
|--------|---------|
| `controllers/` | HTTP handlers |
| `routes/` | Hono route wiring |
| `repositories/` | Drizzle / Postgres access |
| `schemas/` | Zod request bodies |
| `socket/` | Socket.IO emit helpers (activities) |
| `notifications/` | Push / email hooks for circle start |
| `types/` | Session expiry + lifecycle types (`types/index.ts` barrel) |
| `constants/session/` | `room-session-limits`, scheduled join grace |
| `constants/events/` | Socket event name constants |
| `lib/expiry/` | `expires_at`, session cap, timing payload for GET room |
| `lib/session/` | Reconcile eval, invite capacity, lobby gate, date coercion |
| `lib/http-responses.ts` | Shared controller validation helpers |
| `services/session/` | Live session lifecycle, reconcile on access, sweep scheduler |
| `services/access/` | Join, RTC token, open meeting (lobby gate) |
| `services/participation/` | Leave, kick, host end for everyone |
| `services/direct/` | Direct match finalize, expand to circle |
| `services/rtc/` | Session Redis, active RTC room, SFU teardown webhooks |
| `services/circle/` | Title sync for live circles |
| `services/activity/` | Chess + embedded activities |

## Session lifecycle (entry points)

| Flow | Service |
|------|---------|
| Join / GET room / RTC token | `services/session/reconcile-room-session-on-access.service.ts` |
| Host start / auto-start scheduled | `services/session/start-room-session.service.ts`, `maybe-auto-start-scheduled-circle.service.ts` |
| End live session (all reasons) | `services/session/end-live-room-session.service.ts` |
| Background sweep | `services/session/sweep-due-room-sessions.service.ts` + `room-session-sweep.scheduler.ts` |
| Leave RTC only | `services/participation/leave-circle-rtc-session.service.ts` |

## Import conventions

- Prefer `@/modules/rooms/<area>/...` — avoid deep relative paths from controllers when possible.
- Cross-cutting types: `@/modules/rooms/types`.
- Product rules doc: `docs/design/room-session-lifecycle-hinglish.md`.
