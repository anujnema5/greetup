# Rooms module

HTTP + lifecycle for direct calls and spaces. Mirrors the client `features/room` layout: group by **concern**, not by file type only.

## Layout

| Path | Role |
|------|------|
| `controllers/` | HTTP handlers |
| `repositories/` | Drizzle queries |
| `services/access/` | Join, RTC token, open meeting |
| `services/participation/` | Leave, kick, host-end |
| `services/session/` | Start/end live, expiry sync, sweeps |
| `services/rtc/` | Redis session room, SFU teardown |
| `services/moderation/` | NSFW self-report |
| `notifications/` | Push / email hooks for space start |
| `socket/` | Socket.IO emit helpers |
| `lib/` | Expiry math, lobby, reconcile eval |
| `constants/` | Limits, socket event names |
| `types/` | Lifecycle / expiry types |
| `schemas/` | Zod for room HTTP bodies |
| `routes/` | Internal / activity sub-routers |
| `services/direct/` | Direct match finalize, expand to space |
| `services/space/` | Title sync for live spaces |
