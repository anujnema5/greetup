# Room feature (calls + circles)

## Folder map

| Folder | Purpose |
|--------|---------|
| `call/` | In-call UI |
| `call/shell/` | `InCallContainer`, `InCallScreen` |
| `call/stage/` | `MainStage`, top bar, stage overlays |
| `call/tiles/` | Camera tiles + shared parts |
| `call/layouts/grid/` | Circle grid, pagination |
| `call/layouts/screen-share/` | Share strip, cameras under share |
| `call/panels/sidebar/` | People + right sidebar |
| `call/panels/circle-options/` | Circle rename / invite dialog |
| `call/panels/mobile/` | Mobile chat sheet handle |
| `call/toolbar/` | Call toolbar |
| `call/activities/` | Registry + activity stage router |
| `call/activities/stages/` | Generic + shared activity layout |
| `contracts/` | `CallCapabilities`, layout modes |
| `listeners/` | Socket listeners |
| `embedded-activities/` | DB-backed activity catalog |
| `embedded-activities/hooks/` | Catalog RTK hook |
| `embedded-activities/catalog/` | Display + direct-call tab rules |
| `embedded-activities/policy/` | Invite / people-tab policies |
| `embedded-activities/parse/` | API response parsing |
| `hooks/` | Hooks by concern (session, media, toolbar, …) |
| `lib/session/` | Tab sync, return path, RTK cache |
| `lib/call/` | Speaker rings, call duration formatting |
| `lib/minimized-dock/` | Dock focus / silence helpers |
| `lib/navigation/` | Post-call navigation |
| `types/call/` | In-call screen + activity types |
| `types/socket/` | Circle / expand socket payloads |
| `types/api/` | Room HTTP types |
| `types/minimized-dock/` | Dock stage types |
| `constants/call/` | Call flow paths, host-end copy |
| `constants/direct-call/` | 1:1 recovery timing |
| `constants/dev/` | Mock match fixture |
| `components/minimized-dock/` | Floating dock + hydration |
| `components/lobby/` | Pre-call lobby overlay |
| `components/dialogs/` | Add-to-circle dialog |
| `api/` | Room HTTP (RTK) |

`features/rtc/` stays separate — mediasoup, socket, streams only.

## Import conventions

- Prefer `@/features/room/call/...`, `@/features/room/hooks/<concern>/...`, etc.
- Public API: `@/features/room` (components, lib, types — safe for `layout.tsx`).
- Client hooks: `@/features/room/hooks` only (not re-exported from main index).
- Avoid deep imports into `embedded-activities/parse` unless breaking RTK cycles (see `room-api`).

## Public exports (`@/features/room`)

| Export | Role |
|--------|------|
| `InCallContainer` | RTC + API orchestration for `/circle/[roomId]` |
| `InCallScreen` | Full in-call layout |
| `MainStage` | Video stage (tiles / share) |
| `OnHostEndedCircle` | Socket: host ended circle for everyone |
| `OnDirectExpandedToCircle` | Socket: direct call expanded to circle |
| `OnPartnerDisconnected` | Socket: 1:1 partner left |

## Add a new in-call activity

1. Add slug to `types/call/room-activity.types.ts` and server `room_embedded_activities`.
2. Create stage in `features/<name>/` or use `call/activities/stages/generic-activity-stage`.
3. Register in `call/activities/registry.tsx`.
4. Optional: policy row in DB; client defaults in registry `defaultPolicy`.

## Rules

- No `mediasoup` imports outside `features/rtc`.
- One tile implementation (`call/tiles/*`); use `PaginatedTileGrid` for paged rosters.
