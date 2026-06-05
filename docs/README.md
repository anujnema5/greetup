# Documentation

Design notes, runbooks, and deep dives for this repo.  
All paths below are from the **repository root** (`docs/...`).

**New here?** Start with [getting-started/development-run.md](getting-started/development-run.md), then open the area you care about from the tables below.

**Suggested order (WebRTC / calls)**

1. [realtime/rtc-service-redis.md](realtime/rtc-service-redis.md) — Redis + multi-instance (easy language)
2. [realtime/rtc-webrtc-sfu-deep-dive.md](realtime/rtc-webrtc-sfu-deep-dive.md) — signaling + mediasoup end-to-end
3. [realtime/webrtc-direct-and-circle-call-flow.md](realtime/webrtc-direct-and-circle-call-flow.md) — product flows
4. [realtime/video-calling-architecture-and-debugging.md](realtime/video-calling-architecture-and-debugging.md) — client + debugging

---

## Getting started

| Doc | What it is |
|-----|------------|
| [getting-started/development-run.md](getting-started/development-run.md) | Local dev: Docker (Postgres, Redis), env files, running server / client / **rtc-service** / **matching-service** |

## Operations

| Doc | What it is |
|-----|------------|
| [operations/deployment.md](operations/deployment.md) | Deployment notes |
| [operations/email-smtp-provider-greetup.md](operations/email-smtp-provider-greetup.md) | SMTP / email (Greetup) |

## Realtime & WebRTC

| Doc | What it is |
|-----|------------|
| [realtime/rtc-service-redis.md](realtime/rtc-service-redis.md) | How **rtc-service** uses Redis (keys, TTL, room ownership, peers set) — beginner-friendly |
| [realtime/rtc-webrtc-sfu-deep-dive.md](realtime/rtc-webrtc-sfu-deep-dive.md) | JWT → Socket.IO → mediasoup Router / Transport / produce / consume |
| [realtime/webrtc-direct-and-circle-call-flow.md](realtime/webrtc-direct-and-circle-call-flow.md) | Direct vs circle call UX and flow |
| [realtime/video-calling-architecture-and-debugging.md](realtime/video-calling-architecture-and-debugging.md) | Client architecture, Redux, skip/end, debugging |
| [realtime/scaling-mediasoup-sfu-horizontally.pdf](realtime/scaling-mediasoup-sfu-horizontally.pdf) | Scaling the SFU horizontally (PDF) |

## Matching (`matching-service`)

| Doc | What it is |
|-----|------------|
| [matching/matching-engine.md](matching/matching-engine.md) | Matching engine: Redis model, HTTP API, modules, flows |
| [matching/matching-service-plan.md](matching/matching-service-plan.md) | Original plan: Redis keys, lifecycle, milestones |

## Product

| Doc | What it is |
|-----|------------|
| [product/greetup-product-overview.md](product/greetup-product-overview.md) | **Product vision**, users, pillars, journeys, glossary (start here for “what is Greetup?”) |

## Product & system design

| Doc | What it is |
|-----|------------|
| [design/chat-system-design.md](design/chat-system-design.md) | Chat system design |
| [design/matching-system-design.md](design/matching-system-design.md) | Matching / matchmaking (see also [matching/matching-engine.md](matching/matching-engine.md)) |
| [design/room-activities-and-chess.md](design/room-activities-and-chess.md) | Room activities & chess lifecycle |
| [design/room-session-lifecycle-hinglish.md](design/room-session-lifecycle-hinglish.md) | **Hinglish:** circle/direct call kab start/band — per-session limits, scheduled slot, host end |
| [design/room-session-lifecycle-hinglish.html](design/room-session-lifecycle-hinglish.html) | Same guide — **visual HTML** (timeline, priority ladder, dark UI) |
| [design/room-session-lifecycle-hinglish.md](design/room-session-lifecycle-hinglish.md) | **Hinglish:** circle/direct call kab start/band — per-session limits, scheduled slot, host end |
| [design/room-session-lifecycle-hinglish.html](design/room-session-lifecycle-hinglish.html) | Same guide — **visual HTML** (timeline, priority ladder, dark UI) |
| [design/convoiq-greetup-architecture.md](design/convoiq-greetup-architecture.md) | **ConvoIQ × Greetup** — full stack: SFU tap, voiceiq-service, server hooks, phases |
| [design/authentication.md](design/authentication.md) | Better Auth, Firebase Phone, cookies, Next ↔ Hono |
| [design/minimized-room-dock-plan.md](design/minimized-room-dock-plan.md) | Minimized call dock: dominant vs pin vs screen share, tasks for implementation |
| [design/minimized-room-dock-hinglish-guide.md](design/minimized-room-dock-hinglish-guide.md) | **A–Z Hinglish:** full dock feature, flows, Redux/RTC, problems + fixes (beginner-friendly) |

## Reference & exports

| Asset | What it is |
|-------|------------|
| [reference/convoIQ.html](reference/convoIQ.html) | Static HTML export |
| [reference/ConvoIQ - System Architecture.pdf](reference/ConvoIQ%20-%20System%20Architecture.pdf) | Architecture deck / PDF |

---

## Folder layout

```text
docs/
  README.md              ← index (this file)
  product/               # Vision, journeys, glossary
  getting-started/       # Local development
  operations/            # Deploy, email
  realtime/              # rtc-service, mediasoup, WebRTC, Redis
  matching/              # matching-service deep dive + plan
  design/                # Product & platform design
  reference/             # PDFs, HTML exports
```

## Maintenance

- Add new docs under the closest folder above and **add one row** to the matching table.
- Prefer **repo-root-relative** links in prose (`docs/realtime/...`) so links work from other markdown files.
- Repo overview and pointers: root [README.md](../README.md).
- Code and AI tools: [CONTRIBUTING.md](../CONTRIBUTING.md).
