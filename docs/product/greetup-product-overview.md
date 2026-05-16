# Greetup — Product Overview

**Tagline:** Find people who get you.

This document describes **what Greetup is**, **who it is for**, and **how the product fits together**. It is written for founders, product, design, and new engineers. For implementation detail, use the technical docs indexed in [docs/README.md](../README.md).

---

## 1. Vision

Greetup is a **real-time social connection platform** where people meet through **meaningful alignment**—not endless scrolling. Users set who they want to meet (goals, interests, profession, location, mood), get **matched or discover** relevant people, then move naturally across **chat, voice, and video** in **1:1 sessions** or **group circles**, with optional **in-call activities** and community features.

The product optimizes for **genuine conversation** and **repeat relationships**, not vanity metrics. The experience is **moderated and NSFW-free** by design, with community guidelines as a first-class constraint.

---

## 2. Problem & opportunity

| Problem | How Greetup addresses it |
|--------|---------------------------|
| Generic social apps surface everyone; conversations feel random or shallow | Matching uses **goals, interests, profession, location, and session intent** so the first message has context |
| Moving from “matched” to “talking” is friction-heavy | **One flow** from match → chat → voice/video without switching apps |
| Group hangouts and 1:1 chats live in different products | **Circles** (group rooms) and **direct calls** share the same RTC stack and can expand (e.g. direct → circle) |
| Icebreakers are hard | **Conversation cues / icebreakers** (product direction; see landing) tailored to shared signals |
| Trust and safety on live social products | Moderation posture, NSFW controls in chat design, host controls in circles |

---

## 3. Target users

Greetup serves people who want **intentional connection**, including:

- **Friend-seekers** — new city, hobbies, casual company  
- **Networkers** — profession-aligned peers, mentors, collaborators  
- **Language learners** — practice partners by interest and mood  
- **Community builders** — recurring **circles** (music, art, philosophy, startups, etc.)  
- **Daters** — optional goal in onboarding (among others)

Users choose **what they are looking for** (e.g. deep talk, light chat, advice, brainstorm, practice) and **how far** they want to reach (nearby, city, country, global).

---

## 4. Core product pillars

### 4.1 Smart matching

Users complete **profile setup** with:

- **Goals** — make friends, networking, dating, language practice, share ideas, casual chat  
- **Interests & profession** — searchable signals for relevance  
- **Mood & “looking for”** — session-level intent (deep talk, venting, fun, debate, etc.)  
- **Location preferences** — proximity to global  

The **matching-service** scores candidates in **Redis** for low-latency pairing; the main **server** orchestrates room creation and notifies clients over **Socket.IO**. **Premium** users can receive enhanced matching priority (tier exists in schema and matching-service; product surface evolving).

**Primary journey:** Explore / home → **Find match** → **direct (1:1) video room** → optional **Skip** to next candidate or **Add to circle**.

### 4.2 Direct calls (1:1)

- Short-lived **direct** rooms after matchmaking  
- **WebRTC** via **rtc-service** (mediasoup SFU)  
- In-call: mic/camera, screen share, minimize dock, skip/end  
- Can **expand to a circle** and invite others  

Technical flow: [webrtc-direct-and-circle-call-flow.md](../realtime/webrtc-direct-and-circle-call-flow.md).

### 4.3 Circles (group video)

**Circles** are hosted group sessions:

- **Scheduled** or **instant** circles  
- **Host** opens the meeting, starts session, can **end for everyone** or **remove a participant**  
- **Lobby** for guests until host opens the circle  
- **Gallery layout** for multiple video tiles; **dominant speaker** highlighting  
- **People** panel: roster, cameras, shared-screen picker  

Circles appear on **home / active circles** and are joinable by invite or discovery (product-dependent).

### 4.4 Messaging

- **Conversations** linked to rooms and connections  
- Real-time delivery via app **Socket.IO** (`chat:*` events)  
- Design covers typing, read state, media, moderation queue — see [chat-system-design.md](../design/chat-system-design.md)

### 4.5 In-call activities

Activities turn a call into a **shared experience** on the video stage:

| Status | Activity |
|--------|----------|
| **Shipped** | **Chess** — invite, accept, moves, draw, end; Redux + socket sync |
| **Planned / marketed** | Watch Together (YouTube), draw together, study, debate, truth or dare, music rooms, live polls |

Architecture: [room-activities-and-chess.md](../design/room-activities-and-chess.md).

### 4.6 Explore & connections

- **Explore** — topic browse (demo content today) + **user search** (live API)  
- **Connections** — relationship graph for people you have met  
- **Profiles** — public username pages (`/u/[username]`)

### 4.7 Live & streaming (direction)

Landing and roadmap describe **going live** from a match or circle and streaming to platforms (e.g. YouTube). Treat as **product direction** until fully implemented in app routes.

### 4.8 VoiceIQ / conversation intelligence (direction)

Separate **voiceiq-service** and architecture docs support **voice session scoring** and webhooks for B2B-style integrations. This extends the core consumer app with **conversation quality / analytics** capabilities—see `docs/design/voiceIQ-architecture-hinglish.docx` and `docs/reference/ConvoIQ - System Architecture.pdf`.

---

## 5. End-to-end user journeys

### Journey A — “Find someone now” (match → direct call)

```
Sign up / log in → Profile setup → Explore or match CTA
  → Matching-service finds a partner
  → Server creates direct room + RTC token
  → Both join /circle/[roomId] video UI
  → Chat (sidebar), skip, end, or add to circle
```

### Journey B — “Join or host a circle”

```
Create or discover circle → Schedule or go live
  → Host opens meeting / starts session
  → Participants join lobby → in-call gallery
  → Host: rename title, end for everyone, remove participant
  → Activities (e.g. chess), screen share, chat
```

### Journey C — “Stay in touch”

```
After a call → Conversation persists
  → Messages, notifications (circle invite, circle started, etc.)
  → Return via Connections or Messages
```

---

## 6. Trust, safety & quality

- **Community positioning:** moderated, NSFW-free (see landing copy and chat design)  
- **Chat media:** client-side NSFW screening before upload (design)  
- **Host controls:** circle host can end session for all or remove a participant  
- **Auth:** email/OAuth, verified email gates, session-based API access  

---

## 7. Monetization (current direction)

| Element | Notes |
|---------|--------|
| **Premium flag** | `isPremium` / `premiumExpiresAt` on user profile |
| **Premium matching** | Matching-service `premium_pool` strategy — extra retry pass |
| **Premium middleware** | Server routes can require active premium |

Specific pricing, paywall UX, and feature gates should be documented here as they ship.

---

## 8. What is built vs. on the roadmap

Use this table when aligning pitch decks with engineering reality. Update as features ship.

| Area | In production (codebase) | Marketed / planned |
|------|--------------------------|-------------------|
| Auth & onboarding | Yes — goals, interests, profession, mood | — |
| 1:1 matchmaking + direct video | Yes | — |
| Circles (host, lobby, gallery, kick) | Yes | — |
| Chat in call | Yes (conversation-linked) | Richer moderation automation |
| Chess in call | Yes | More embedded activities |
| User search (Explore) | Yes | Full topic discovery (less demo data) |
| Premium matching tier | Partial (backend) | Full premium UX |
| Icebreakers / ConvoIQ cues | Direction | Landing showcases |
| Watch Together, draw, polls, etc. | Placeholder / generic activity UI | Landing list |
| Live streaming to YouTube | Direction | Landing section |
| Push notifications | Design in chat doc | Implementation |

---

## 9. Platform map (one page)

```
┌─────────────┐     REST + Socket.IO      ┌─────────────┐
│   Client    │ ─────────────────────────►│   Server    │
│  (Next.js)  │                           │  (Hono)     │
└──────┬──────┘                           └──────┬──────┘
       │ WebRTC signaling                     │ HTTP internal
       ▼                                      ▼
┌─────────────┐     webhook / internal  ┌─────────────┐
│ rtc-service │ ◄────────────────────── │  matching-  │
│ (mediasoup) │                         │  service    │
└─────────────┘                         └─────────────┘
       │                                      │
       └──────────────┬───────────────────────┘
                      ▼
              PostgreSQL + Redis
```

Deeper architecture: root [README.md](../../README.md) and [docs/README.md](../README.md).

---

## 10. Glossary

| Term | Meaning |
|------|---------|
| **Direct room** | 1:1 call room (`room_type = direct`), usually from matchmaking |
| **Circle** | Group video room (`room_type = circle`) with a host |
| **Match** | Pairing of two users via matching-service |
| **SFU** | Selective Forwarding Unit — rtc-service relays media without full mesh |
| **RTC token** | Short-lived JWT to join rtc-service for a specific `roomId` |
| **Explore hub** | Post-call navigation target after leave / skip (`/explore`) |

---

## 11. Related documents

| Document | Purpose |
|----------|---------|
| [matching-system-design.md](../design/matching-system-design.md) | How matching works |
| [webrtc-direct-and-circle-call-flow.md](../realtime/webrtc-direct-and-circle-call-flow.md) | Call UX flows |
| [chat-system-design.md](../design/chat-system-design.md) | Messaging & moderation design |
| [room-activities-and-chess.md](../design/room-activities-and-chess.md) | In-call activities |
| [convoiq-greetup-architecture.md](../design/convoiq-greetup-architecture.md) | ConvoIQ / VoiceIQ — full implementation architecture |
| [authentication.md](../design/authentication.md) | Sign-in and sessions |
| Client landing (`client/src/app/landing/page.tsx`) | Marketing copy and feature promises |

---

## 12. Maintaining this doc

- Update **§8 (built vs. roadmap)** when major features launch.  
- Keep **§4 pillars** aligned with onboarding seeds and landing page.  
- Add a row to [docs/README.md](../README.md) when this file changes materially.

*Last aligned with codebase: May 2026.*
