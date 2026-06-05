# ConvoIQ × Greetup — Full System Architecture

**Purpose:** Single source of truth for how conversation intelligence fits into the existing Greetup stack — from a live call through scoring, storage, and user-facing features.

**Audience:** Engineers implementing Phase 1–2 (Greetup integration) and Phase 3+ (B2B API / plugins).

**Aligned with codebase:** May 2026. Service name in repo is **`voiceiq-service`** (ConvoIQ product name).

**Related:** [greetup-product-overview.md](../product/greetup-product-overview.md) · [webrtc-direct-and-circle-call-flow.md](../realtime/webrtc-direct-and-circle-call-flow.md) · [rtc-webrtc-sfu-deep-dive.md](../realtime/rtc-webrtc-sfu-deep-dive.md)

---

## 1. What we are building

| Product layer | What it is | Revenue |
|---------------|------------|---------|
| **Greetup (consumer)** | Match → direct video or group **circles** → chat, activities | Free + premium |
| **ConvoIQ inside Greetup** | Same calls, scored in the background → score cards, coaching, leaderboards | Premium |
| **VoiceIQ API (B2B)** | Any company attaches audio (Greetup room, bot, browser SDK) → scores + webhook | SaaS plans |

**One audio pipeline, three surfaces.** Greetup does not get a second RTC stack — ConvoIQ taps the SFU you already run.

---

## 2. Services map

```
┌──────────────────────────────────────────────────────────────────────────┐
│  CLIENT (Next.js)                                                         │
│  /circle/[roomId]  — WebRTC UI, chat, chess, people panel                │
│  (future) recap, profile intelligence, premium gates                     │
└───────────────┬──────────────────────────────┬───────────────────────────┘
                │ REST + Socket.IO              │ WebRTC + Socket.IO
                ▼                               ▼
┌───────────────────────────┐       ┌──────────────────────────────────────┐
│  SERVER (Hono)            │       │  RTC-SERVICE (mediasoup SFU)          │
│  rooms, match, chat, auth │──────►│  Router per room, Producers/Consumers │
│  circle host controls     │internal│  POST /internal/voiceiq/tap           │
└───────────────┬───────────┘       └──────────────────┬───────────────────┘
                │                                         │ RTP/UDP Opus
                │ orchestrates (to build)                 │ per speaker (SSRC)
                ▼                                         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  VOICEIQ-SERVICE (Hono + BullMQ)                                          │
│  Sessions · sources · scoring · webhooks · rubrics (B2B)                  │
│  Postgres (voiceiq_*) · Redis (live scores, context buffer, queues)       │
└──────────────────────────────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────┐       ┌───────────────────────────┐
│  MATCHING-SERVICE         │       │  PostgreSQL + Redis        │
│  (pairing only)           │       │  (shared infra)            │
└───────────────────────────┘       └───────────────────────────┘
```

| Service | Port (local) | Owns |
|---------|--------------|------|
| `client` | 3000 | Call UX, signaling client |
| `server` | 3002 | Rooms, users, Socket.IO app events |
| `rtc-service` | 3001 | mediasoup, RTC tokens, VoiceIQ tap |
| `voiceiq-service` | 4000 | Scoring pipeline, B2B API |
| `matching-service` | — | Redis match pools |

---

## 3. End-to-end flow (Greetup call)

### 3.1 Direct match call

```
1. User A + B matched (matching-service)
2. server creates direct room, issues RTC JWTs
3. Both join /circle/[roomId] — existing client + rtc-service path
4. [NEW] server starts VoiceIQ session + attaches mediasoup source for roomId
5. Users talk — audio analyzed in background (no UX change in Phase 1)
6. Skip / end call
7. [NEW] server ends VoiceIQ session
8. [Phase 2] client shows post-call score recap
```

### 3.2 Circle (group)

Same as direct, with these differences:

| Moment | Action |
|--------|--------|
| Host **starts session** | Start VoiceIQ session + tap (not on lobby-only join) |
| Participant joins | rtc-service `onMicAudioProducerAdded` adds consumer to existing tap |
| Host **end for everyone** | `notifyRtcServiceSfuRoomTeardown` → releases taps; end VoiceIQ session |

---

## 4. Audio pipeline (core)

### 4.1 Why mediasoup fits ConvoIQ

mediasoup gives **one Producer per speaker per track**. ConvoIQ needs per-speaker audio, not a mixed recording. A **PlainTransport** on the SFU forwards each mic as separate RTP; **SSRC** identifies who spoke.

**Key design choice in our repo:** one PlainTransport **per VoiceIQ session (per room tap)**, with **multiple Consumers** (one per mic Producer) — not one transport per speaker. Isolation is still per-speaker via SSRC routing on the voiceiq side.

### 4.2 Step-by-step (implemented today)

| Step | Where | What happens |
|------|--------|----------------|
| 1 | `rtc-service` | User produces mic audio → `Producer` on router |
| 2 | `peer.service.ts` | On mic producer: `voiceIqTapService.onMicAudioProducerAdded` |
| 3 | `voiceiq-service` | `MediasoupAdapter.connect()` → `POST /internal/voiceiq/tap` |
| 4 | `voiceiq-tap.service.ts` | Creates PlainTransport, consumes all current mic producers, returns SSRC → `participantId` map |
| 5 | `MediasoupAdapter` | UDP socket receives RTP → `parseRTP` → `AudioBufferPool.push` |
| 6 | `audio-buffer.ts` | ~30s of audio per participant → STT → enqueue scoring job |
| 7 | `scoring.worker.ts` | Claude `scoreWindow()` → insert `voiceiq_scores` → Redis live score |
| 8 | Room ends | `releaseAllTapsForRoom` on teardown |

**Internal rtc-service routes** (`rtc-service/src/http/create-app.ts`):

- `POST /internal/voiceiq/tap` — create tap
- `DELETE /internal/voiceiq/tap/:tapId` — release tap

### 4.3 Target pipeline (Phase 1 completion)

Roadmap described FFmpeg + Whisper per speaker in Python. **Our implementation path:**

| Stage | Planned implementation | Status |
|-------|-------------------------|--------|
| RTP receive | `MediasoupAdapter` + `rtp-parser.ts` | ✅ Done |
| Decode Opus → PCM | FFmpeg subprocess **or** native Opus decoder in voiceiq-service | ❌ TODO |
| VAD / chunking | Silero VAD, 15–30s chunks, 2s overlap | ❌ TODO |
| STT | Whisper (local HTTP or sidecar) | ❌ Stub in `audio-buffer.ts` |
| Context buffer | Redis rolling timeline (see §5) | ❌ TODO |
| Scoring | Claude via `scoring/engine.ts` | ✅ Done |
| Embeddings / Qdrant | Phase 2+ peer match | ❌ Not started |

Until STT is real, scoring runs on placeholder transcripts — use for plumbing only.

### 4.4 Data-flow diagram

```
mediasoup Room (rtc-service)
│
├── Mic Producer (Alice)  ──┐
├── Mic Producer (Bob)    ──┼──► PlainTransport tap
└── Mic Producer (Carol)  ──┘         │
                                      │ RTP/UDP (Opus, per SSRC)
                                      ▼
                            voiceiq-service
                            MediasoupAdapter
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
              Buffer (Alice)    Buffer (Bob)      Buffer (Carol)
                    │                 │                 │
                    ▼                 ▼                 ▼
              STT (Alice)         STT (Bob)         STT (Carol)
                    │                 │                 │
                    └────────┬────────┴────────┬────────┘
                             ▼                 │
                    room_context:{roomId}      │  (Redis, 5-min window)
                             │                 │
                             ▼                 ▼
                    scoreWindow(Alice)   scoreWindow(Bob) ...
                             │                 │
                             ▼                 ▼
                    voiceiq_scores (Postgres) + voiceiq:live_score (Redis)
```

---

## 5. Multi-speaker scoring context

**Problem:** Scoring Alice’s line *"Exactly, Friedman called it the long and variable lag"* in isolation looks vague; with Bob’s prior line about rate lag, it shows depth.

**Solution:** Shared **room context buffer** in Redis. Each speaker still has their own audio path; only the **Claude prompt** gets the full recent timeline.

| Piece | Behavior |
|-------|----------|
| Key | `voiceiq:room_context:{roomId}` (add to `voiceiq-service/src/core/redis/keys.ts`) |
| On each transcript chunk | `RPUSH` `{ speaker_id, text, ts }`; trim entries older than 5 minutes |
| TTL | Key expires ~6 minutes after last activity |
| On score job | Worker loads context, formats timeline, scores **only target speaker’s lines** |
| Storage | Context buffer **never** written to Postgres; transcript in `voiceiq_scores` is optional audit (can hash/truncate for privacy) |

**Prompt change:** extend `SCORING_PROMPT` in `voiceiq-service/src/scoring/prompts.ts` with a `{conversation_timeline}` block and instruction: *evaluate only lines from `{target_speaker}`*.

**Edge cases:** simultaneous speech (order by `ts`), monologue (context is mostly one speaker), short utterances under 3s (context only, may skip scoring), late joiner (context fills within 5 minutes).

---

## 6. VoiceIQ service (brain)

### 6.1 API surface (`/v1`)

| Endpoint | Purpose |
|----------|---------|
| `POST /v1/session` | Create scoring session |
| `POST /v1/session/:id/end` | End session → aggregate → webhook |
| `GET /v1/session/:id/results` | Poll scores + coaching |
| `GET /v1/session/:id/live` | Live scores from Redis |
| `POST /v1/sources/attach` | Attach audio source (`mediasoup`, `browser-sdk`, `meeting-bot`, `direct-upload`) |
| `POST /v1/sources/detach` | Stop source |
| `POST /v1/bot/join` | B2B meeting bot (stub lifecycle) |
| `POST/GET /v1/rubrics` | Custom scoring rubrics |

Auth: `X-API-Key` per company (`voiceiq_companies` table).

### 6.2 Source types

| `source_type` | Adapter | Use case |
|---------------|---------|----------|
| `mediasoup` | `MediasoupAdapter` | **Greetup** — tap rtc-service room |
| `browser-sdk` | `WebSocketAdapter` | Browser sends audio |
| `meeting-bot` | `WebSocketAdapter` | Puppeteer bot (Phase 4) |
| `direct-upload` | `DirectUploadAdapter` | REST transcript upload |

Greetup uses **`mediasoup`** only for in-app calls.

### 6.3 Job queues (BullMQ)

| Queue | Job | Worker |
|-------|-----|--------|
| `voiceiq:scoring` | One 30s window per participant | `scoring.worker.ts` → Claude → Postgres + Redis |
| `voiceiq:webhooks` | Session end | Aggregate → `generateFeedback()` → POST `notify_url` |

### 6.4 Database (voiceiq Postgres)

| Table | Purpose |
|-------|---------|
| `voiceiq_sessions` | One row per scoring session |
| `voiceiq_participants` | Speakers in session |
| `voiceiq_scores` | Per-window dimension scores + transcript |
| `voiceiq_feedback` | End-of-session coaching report |
| `voiceiq_companies` / `voiceiq_rubrics` | B2B tenants |

**Schema gap for Greetup:** add `greetup_room_id TEXT` (and optionally `room_type`) on `voiceiq_sessions` so server can look up sessions by Greetup `roomId`.

---

## 7. rtc-service hooks

### 7.1 Already implemented

| Event | Code | Action |
|-------|------|--------|
| Mic producer added | `peer.service.ts` → `onMicAudioProducerAdded` | Add consumer to active tap(s); publish `voiceiq_tap_consumer_added` |
| Room SFU teardown | `peer.service.ts` → `releaseAllTapsForRoom` | Close PlainTransport + consumers |

### 7.2 Not required from rtc-service for Greetup

The roadmap suggested `POST /internal/session/start` on every `room:created`. **Preferred in our stack:** **server** calls VoiceIQ when the product says analysis should start (match connected, circle session started). rtc-service only needs the tap endpoints when voiceiq attaches.

Optional future: rtc webhook to server on first producer if you want fully automatic starts without server orchestration.

---

## 8. Server (Greetup orchestrator) — to build

The main integration gap: **server does not yet call voiceiq-service on room lifecycle.**

### 8.1 New module (suggested)

`server/src/modules/voiceiq/`

- `voiceiq-client.ts` — HTTP client with `INTERNAL_API_KEY` / Greetup company API key
- `start-room-analysis.service.ts`
- `end-room-analysis.service.ts`

### 8.2 When to start analysis

| Trigger | Room type |
|---------|-----------|
| Both users connected / match active | `direct` |
| Host starts circle session | `circle` |
| Optional: user opt-in consent flag | both |

### 8.3 Start sequence

```typescript
// Pseudocode — server
async function startRoomAnalysis(roomId: string, roomType: 'direct' | 'circle', participantUserIds: string[]) {
  const session = await voiceiq.post('/v1/session', {
    participants: participantUserIds.map(id => ({ greetup_user_id: id })),
    // map to voiceiq participant rows
  })

  await voiceiq.post('/v1/sources/attach', {
    source_type: 'mediasoup',
    session_id: session.session_id,
    room_id: roomId,
    rtc_service_url: config.rtcServiceBaseUrl,
  })

  await redis.set(`greetup:room:${roomId}:voiceiq_session`, session.session_id)
}
```

### 8.4 End sequence

| Trigger | Action |
|---------|--------|
| User leaves / skip (direct) | End session if last participant |
| Host end circle for everyone | `notifyRtcServiceSfuRoomTeardown` + `POST /v1/session/:id/end` |
| RTC room empty | voiceiq tap already released by rtc-service |

### 8.5 Consumer API (Phase 2)

Do **not** expose VoiceIQ API keys to the browser. Server proxies:

- `GET /api/rooms/:roomId/convoiq/recap` → voiceiq results mapped to Greetup user IDs
- `GET /api/me/intelligence` → aggregated profile

---

## 9. Client (Greetup UI)

### 9.1 Phase 1 — no UI

Calls unchanged. Optional internal admin page only.

### 9.2 Phase 2 — user-facing

| Surface | Behavior |
|---------|----------|
| Post-call recap | After leave → modal or `/call/[roomId]/recap` |
| Profile tab | Topic scores, trends |
| Premium gates | Composite only (free) vs all dimensions + coaching (premium) |
| In-call (optional) | Live score chip via server SSE/WS reading Redis |

### 9.3 Icebreakers / cues (related, separate)

Landing promises “conversation cues.” Can ship **before** full scoring using match profile (interests, goals) from server — does not require VoiceIQ.

---

## 10. Privacy & data handling

| Data | Handling |
|------|----------|
| Raw RTP / PCM | Stream only; never persist to disk |
| Room context buffer | Redis, 5-min rolling, auto-expire |
| Transcript text | Minimize retention; scoring worker may store window in `voiceiq_scores` — consider truncation for consumer tier |
| Scores (numbers) | Postgres; user deletable |
| Voice embeddings | pgvector on participants (future re-ID); encrypted vectors in Qdrant (Phase 2+) |

**Consent:** show opt-in before first analysis (Phase 2); server gates `startRoomAnalysis`.

---

## 11. B2B path (same pipeline)

External customers never touch Greetup server:

```
Company → POST /v1/session (API key)
       → POST /v1/sources/attach (mediasoup | bot | browser-sdk)
       → GET /v1/session/:id/results OR webhook on end
```

Greetup is logically **one VoiceIQ company** with a fixed internal API key.

---

## 12. Phased delivery

| Phase | Goal | Main work |
|-------|------|-----------|
| **1** | Silent scoring on all Greetup calls | Server start/end, real STT, context buffer, `greetup_room_id`, admin verify |
| **2** | Consumer product | Recap UI, coaching, leaderboards, premium, privacy dashboard |
| **3** | B2B polish | Usage metering, dashboard, rubric UX (API largely exists) |
| **4** | Bot + SDK | Puppeteer bot, npm SDK |
| **5** | Plugins | Chrome, Meet, Zoom, Teams → same `/v1/bot/join` |
| **6** | Enterprise | SSO, tenancy, Kafka at scale |

---

## 13. Implementation checklist (ordered)

1. **Migration:** `greetup_room_id`, `room_type` on `voiceiq_sessions`.
2. **Server:** `startRoomAnalysis` / `endRoomAnalysis` wired to direct + circle lifecycle.
3. **STT:** Replace stub in `audio-buffer.ts` (Whisper HTTP or worker).
4. **Context:** `context-assembler.ts` + Redis key + scoring worker + prompt update.
5. **Participant mapping:** Greetup `userId` ↔ `voiceiq_participants.id` at attach time (store in Redis or session metadata).
6. **Late joiner:** Subscribe to `voiceiq_tap_consumer_added` (Redis room media events) → `MediasoupAdapter.addConsumer`.
7. **Admin:** internal page listing sessions by `roomId`.
8. **Client Phase 2:** recap + profile routes via server proxy.

---

## 14. Code map (where to edit)

| Area | Path |
|------|------|
| SFU tap create/release | `rtc-service/src/modules/voiceiq/voiceiq-tap.service.ts` |
| Tap HTTP handlers | `rtc-service/src/modules/voiceiq/voiceiq.controller.ts` |
| Mic producer hook | `rtc-service/src/modules/rtc/peer/peer.service.ts` |
| RTP → buffer | `voiceiq-service/src/sources/adapters/mediasoup.adapter.ts` |
| 30s flush + STT | `voiceiq-service/src/sources/audio-buffer.ts` |
| Scoring prompts | `voiceiq-service/src/scoring/prompts.ts` |
| Claude calls | `voiceiq-service/src/scoring/engine.ts` |
| Scoring worker | `voiceiq-service/src/queue/workers/scoring.worker.ts` |
| Attach API | `voiceiq-service/src/modules/sources/sources.service.ts` |
| Redis keys | `voiceiq-service/src/core/redis/keys.ts` |
| Room teardown → rtc | `server/src/modules/rooms/services/rtc-sfu-room-teardown.service.ts` |
| Room lifecycle (wire here) | `server/src/modules/rooms/services/join-room.service.ts`, circle start/end services |
| Call UI | `client/src/features/room/` |

---

## 15. Cost estimate (3-person, 15-min circle)

Assumptions: ~30s scoring windows, Claude per window per speaker, one feedback call each at end.

| Item | Approx. |
|------|---------|
| Whisper (self-hosted) | ~$0 |
| Claude scoring (~45 windows × $0.003) | ~$0.14 |
| Claude feedback (3 × $0.003) | ~$0.01 |
| **Total** | **~$0.15 / session** |

Context in prompts increases input tokens slightly; use Claude prompt caching (already in `engine.ts`) for the stable system turn.

---

*Last updated: May 2026. Update §12–13 when Phase 1 ships.*
