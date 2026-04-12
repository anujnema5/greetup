# Circlo — Chat System Architecture
> Final decided architecture. Single AEK encryption. KMS for key storage.

---

## Table of Contents

1. [Getting Started — How Everything Fits Together](#1-getting-started)
2. [Encryption Architecture](#2-encryption-architecture)
3. [AEK Rotation](#3-aek-rotation)
4. [Database Schema](#4-database-schema)
5. [Conversation Types & Persistence](#5-conversation-types--persistence)
6. [Connection DM History in Room](#6-connection-dm-history-in-room)
7. [1:1 → Circle Expansion](#7-11--circle-expansion)
8. [Adding People to Existing Circle](#8-adding-people-to-existing-circle)
9. [NSFW Detection](#9-nsfw-detection)
10. [Server Module Structure](#10-server-module-structure)
11. [Socket.IO Events](#11-socketio-events)
12. [HTTP API Endpoints](#12-http-api-endpoints)
13. [Redis Layer](#13-redis-layer)
14. [Performance & Latency](#14-performance--latency)
15. [Multi-Instance Architecture](#15-multi-instance-architecture)
16. [Client-Side Architecture](#16-client-side-architecture)
17. [Scalability](#17-scalability)
18. [Security Summary](#18-security-summary)
19. [Dependencies](#19-dependencies)
20. [Implementation Phases](#20-implementation-phases)

---

## 1. Getting Started

Read this first. Full picture before diving into any section.

### The Big Picture

```
┌──────────────────────────────────────────────────────────────────┐
│                        KMS / DOPPLER                             │
│                                                                  │
│   AEK (Application Encryption Key)                              │
│   → 32 random bytes, lives here only                            │
│   → Fetched ONCE on server startup                              │
│   → Never in DB, never in code, never in logs                   │
└──────────────────────────┬───────────────────────────────────────┘
                           │ loaded once on startup
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                       SERVER MEMORY                              │
│                                                                  │
│   AEK cached here as Buffer                                      │
│   Used for every encrypt/decrypt call                            │
│   No network call per message — just a RAM read                  │
└──────────────────────────┬───────────────────────────────────────┘
                           │ encrypts/decrypts directly
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                        POSTGRESQL                                │
│                                                                  │
│   messages { encryptedContent, iv }  ← encrypted by AEK         │
│                                                                  │
│   DB leaked alone = nothing readable. AEK never in DB.          │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                           REDIS                                  │
│                                                                  │
│   Unread counts, typing, online presence, rate limits            │
│   Shared across ALL server instances                             │
│   AEK is never stored here                                       │
└──────────────────────────────────────────────────────────────────┘
```

---

### A Message Being Sent — Full Flow

```
Server boots
  └── loadAEK() → fetches AEK from Doppler/AWS → cached in RAM

Alice picks a media file → hits send
  └── nsfwjs scan BEFORE anything reaches server
        └── flagged  → block, show error, done
        └── clean    → proceed with upload to Spaces

Alice types "hey" → hits send
  └── text → no scan, proceed directly

Socket.IO emit: { conversationId, content: "hey" }  [over TLS]

Server receives:
  1. Auth check (JWT)                   ~0ms    memory
  2. Rate limit check                   ~1ms    Redis
  3. encryptMessage(AEK, "hey")         ~0.1ms  AEK already in RAM
     └── randomBytes(12) = fresh IV
     └── AES-256-GCM → ciphertext + auth tag
  4. INSERT INTO messages               ~3-5ms  PostgreSQL
  5. Decrypt in memory → broadcast      ~1ms    Redis pub/sub
     └── all instances → Bob's socket

Bob receives "hey" as plaintext over TLS

Server total:    ~5-7ms
End to end:      ~50-90ms  (same as WhatsApp / Telegram)
```

---

### What Makes Each Message Secure

```
Random IV per message:
  "hello" encrypted 1000 times = 1000 different ciphertexts
  Attacker cannot detect patterns or repeated messages

GCM Auth Tag per message:
  Any modification to ciphertext in DB
  → decryption throws error immediately
  → tampered message never reaches user

AEK never in DB:
  DB leaked alone = useless ciphertext
  Attacker needs AEK + DB together to read anything

TLS everywhere:
  Plaintext never travels over the network unencrypted
```

---

### Conversation Types at a Glance

```
Two connections enter a Direct Room together
  └── existing DM history linked to room — full history visible

Direct Room (1:1)
  └── ephemeral by default
  └── both set wantsPersistence = true → messages saved
  └── only one agrees → stays ephemeral

1:1 Room expands (Alice adds Carol)
  └── NEW circle conversation created
  └── Alice + Bob see banner: "View previous 1:1 conversation"
  └── Carol sees nothing before "Alice added Carol" system message

New person added to existing circle (Alice adds Dave)
  └── NO new conversation created
  └── Dave sees ALL previous circle messages
  └── "Alice added Dave" marker shows his join point in history

Connection DM
  └── always saved
  └── created on first message between accepted connections
```

---

### Multi-Instance in One Line

```
PostgreSQL  →  source of truth for all conversations and messages
Redis       →  shared real-time layer (presence, pub/sub, rate limits)
AEK         →  same key loaded by every instance on startup
               any instance encrypts/decrypts identically
```

---

### What You Are and Are Not Protected Against

```
Protected:
  ✓ DB leak (SQL injection, misconfigured DB, backup leak)
  ✓ Network interception (TLS)
  ✓ Message tampering (GCM auth tag)
  ✓ Code/git leak (AEK not in code or .env)

Not protected (accepted tradeoff — same as Instagram, Slack, Discord):
  ✗ Full server compromise → attacker reads RAM → gets AEK
  ✗ Secrets manager breach → attacker gets Doppler/AWS creds
  ✗ Insider threat → employee with production access

Future protection:
  → Phase 7: True E2E Secret Conversations
  → Server cannot read messages even with full access
```

---

## 2. Encryption Architecture

### Decision: Single AEK

One AEK encrypts and decrypts all messages directly.
No per-conversation keys. No wrapping. Simple and proven.

Same model used by Instagram, Discord, Slack at massive scale.

### KMS Strategy by Stage

| Stage | Tool | Where AEK lives | Code change to upgrade |
|---|---|---|---|
| Now | **Doppler** | Synced as env var | No code change |
| Scaling | **AWS Secrets Manager** | Fetched via API on startup | Only `aek-loader.ts` |
| Compliance | **AWS KMS operations** | Never in RAM at all | Full crypto rewrite |

---

### aek-loader.ts

The only file that knows where AEK comes from.
All crypto code calls `getAEK()` — never reads `process.env` directly.
Upgrading secrets provider = only this file changes.

**Stage 1 — Doppler:**

```typescript
// server/src/core/crypto/aek-loader.ts

let AEK: Buffer | null = null;
let OLD_AEK: Buffer | null = null;

export async function loadAEKs(): Promise<void> {
  if (!process.env.MESSAGE_ENCRYPTION_KEY) {
    throw new Error('MESSAGE_ENCRYPTION_KEY not set in Doppler');
  }

  AEK = Buffer.from(process.env.MESSAGE_ENCRYPTION_KEY, 'hex');

  if (AEK.length !== 32) {
    throw new Error('MESSAGE_ENCRYPTION_KEY must be 32 bytes (64 hex chars)');
  }

  // Only present during AEK rotation window
  OLD_AEK = process.env.MESSAGE_ENCRYPTION_KEY_PREVIOUS
    ? Buffer.from(process.env.MESSAGE_ENCRYPTION_KEY_PREVIOUS, 'hex')
    : null;

  console.log('AEK loaded into memory ✓');
  // NEVER log AEK.toString('hex') — logs ship to Datadog/Sentry
}

export function getAEK(): Buffer {
  if (!AEK) throw new Error('AEK not loaded — call loadAEKs() on startup');
  return AEK;
}

export function getOldAEK(): Buffer | null {
  return OLD_AEK;
}
```

**Stage 2 — AWS Secrets Manager (only this file changes):**

```typescript
// server/src/core/crypto/aek-loader.ts
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'us-east-1' });

let AEK: Buffer | null = null;
let OLD_AEK: Buffer | null = null;

export async function loadAEKs(): Promise<void> {
  const current = await client.send(new GetSecretValueCommand({
    SecretId: 'circlo/production/MESSAGE_ENCRYPTION_KEY',
  }));
  AEK = Buffer.from(current.SecretString!, 'hex');

  if (AEK.length !== 32) throw new Error('AEK must be 32 bytes');

  try {
    const previous = await client.send(new GetSecretValueCommand({
      SecretId: 'circlo/production/MESSAGE_ENCRYPTION_KEY_PREVIOUS',
    }));
    OLD_AEK = Buffer.from(previous.SecretString!, 'hex');
  } catch {
    OLD_AEK = null; // no rotation in progress — normal
  }

  console.log('AEK loaded from AWS Secrets Manager ✓');
}

export function getAEK(): Buffer {
  if (!AEK) throw new Error('AEK not loaded — call loadAEKs() on startup');
  return AEK;
}

export function getOldAEK(): Buffer | null {
  return OLD_AEK;
}
```

---

### Server Boot

```typescript
// server/src/index.ts
import { loadAEKs } from './core/crypto/aek-loader';

async function bootstrap() {
  await loadAEKs();        // always first — never start without AEK

  await connectDatabase();
  await connectRedis();
  startSocketIO();
  startHonoServer();

  console.log('Server ready');
}

bootstrap().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);         // hard exit — never run without AEK
});
```

---

### message-crypto.ts

```typescript
// server/src/core/crypto/message-crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { getAEK, getOldAEK } from './aek-loader';
// Never import process.env here — always use getAEK()

export function encryptMessage(plaintext: string)
    : { encryptedContent: string; iv: string } {
  const aek = getAEK();        // reads from RAM — ~0ms, no network

  const iv = randomBytes(12);  // unique per message — critical for GCM security
  const cipher = createCipheriv('aes-256-gcm', aek, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    encryptedContent: Buffer.concat([enc, tag]).toString('base64'),
    iv: iv.toString('base64'),
  };
}

export function decryptMessage(encryptedContent: string, iv: string): string {
  const data  = Buffer.from(encryptedContent, 'base64');
  const ivBuf = Buffer.from(iv, 'base64');
  const tag   = data.subarray(data.length - 16);
  const ct    = data.subarray(0, data.length - 16);

  // Try current AEK first
  try {
    const d = createDecipheriv('aes-256-gcm', getAEK(), ivBuf);
    d.setAuthTag(tag);
    return d.update(ct) + d.final('utf8');
  } catch {
    // Fall back to old AEK during rotation window
    const oldAek = getOldAEK();
    if (oldAek) {
      const d = createDecipheriv('aes-256-gcm', oldAek, ivBuf);
      d.setAuthTag(tag);
      return d.update(ct) + d.final('utf8');
    }
    throw new Error('Decryption failed — wrong key or tampered message');
  }
}
```

---

## 3. AEK Rotation

Zero downtime. Messages re-encrypted with new AEK in background batches.

### When to Rotate

- Scheduled every 6–12 months
- Suspected AEK exposure
- Secrets manager breach
- Staff with production access leaves the team

### Procedure

```
1. Generate new AEK:
   openssl rand -hex 32

2. Set both keys in Doppler/AWS:
   MESSAGE_ENCRYPTION_KEY          = <new key>
   MESSAGE_ENCRYPTION_KEY_PREVIOUS = <old key>

3. Deploy server
   → Tries new AEK first, falls back to old AEK on decrypt
   → Zero downtime — all existing messages still decrypt fine

4. Run rotation script:
   npx tsx server/src/scripts/rotate-aek.ts
   → Re-encrypts all messages with new AEK in batches of 100
   → 50ms pause between batches

5. Verify — spot check conversations, check script logs

6. Remove old key:
   MESSAGE_ENCRYPTION_KEY_PREVIOUS = (delete from Doppler/AWS)

7. Deploy again → rotation complete ✓
```

### Rotation Script

```typescript
// server/src/scripts/rotate-aek.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

async function rotateAEK() {
  const NEW_AEK = Buffer.from(process.env.MESSAGE_ENCRYPTION_KEY!, 'hex');
  const OLD_AEK = Buffer.from(process.env.MESSAGE_ENCRYPTION_KEY_PREVIOUS!, 'hex');

  if (!NEW_AEK || !OLD_AEK) {
    throw new Error('Both keys must be set before running rotation');
  }

  let offset = 0;
  let total = 0;

  while (true) {
    const rows = await db.select({
      id: messages.id,
      encryptedContent: messages.encryptedContent,
      iv: messages.iv,
    }).from(messages).limit(100).offset(offset);

    if (rows.length === 0) break;

    await db.transaction(async (tx) => {
      for (const row of rows) {
        const plaintext    = _decrypt(OLD_AEK, row.encryptedContent, row.iv);
        const reencrypted  = _encrypt(NEW_AEK, plaintext);
        await tx.update(messages)
          .set(reencrypted)
          .where(eq(messages.id, row.id));
      }
    });

    total += rows.length;
    console.log(`Rotated ${total} messages...`);
    offset += 100;
    await new Promise(r => setTimeout(r, 50));
  }

  console.log(`Rotation complete. Total: ${total}`);
}

function _encrypt(aek: Buffer, plaintext: string) {
  const iv = randomBytes(12);
  const c  = createCipheriv('aes-256-gcm', aek, iv);
  const enc = Buffer.concat([c.update(plaintext, 'utf8'), c.final()]);
  const tag = c.getAuthTag();
  return {
    encryptedContent: Buffer.concat([enc, tag]).toString('base64'),
    iv: iv.toString('base64'),
  };
}

function _decrypt(aek: Buffer, encryptedContent: string, iv: string): string {
  const data  = Buffer.from(encryptedContent, 'base64');
  const ivBuf = Buffer.from(iv, 'base64');
  const tag   = data.subarray(data.length - 16);
  const ct    = data.subarray(0, data.length - 16);
  const d     = createDecipheriv('aes-256-gcm', aek, ivBuf);
  d.setAuthTag(tag);
  return d.update(ct) + d.final('utf8');
}

rotateAEK().catch(console.error);
```

### Time Estimates

| Messages | Estimated Time |
|---|---|
| 100K | ~2-3 minutes |
| 1M | ~20-30 minutes |
| 10M | ~3-4 hours — run during low traffic |

---

## 4. Database Schema

```typescript
// server/src/core/database/schema/chat.ts

export const conversationTypeEnum = pgEnum('conversation_type', [
  'room_direct',   // 1:1 room chat
  'room_circle',   // group/circle room chat
  'connection',    // DM between accepted connections
]);

export const messageTypeEnum = pgEnum('message_type', [
  'text', 'image', 'video', 'file', 'voice', 'gif', 'system',
]);

export const mediaTypeEnum = pgEnum('chat_media_type', [
  'image', 'video', 'file', 'voice', 'gif',
]);

// ── Conversations ──────────────────────────────────────────────────

export const conversations = pgTable('conversations', {
  id:           uuid('id').primaryKey().defaultRandom(),
  type:         conversationTypeEnum('type').notNull(),
  roomId:       uuid('room_id').references(() => rooms.id),
  connectionId: uuid('connection_id').references(() => userConnections.id),
  isPersisted:  boolean('is_persisted').notNull().default(false),

  // Expansion tracking
  parentConversationId: uuid('parent_conversation_id'),
  expandedAt:           timestamp('expanded_at'),
  expandedByUserId:     text('expanded_by_user_id').references(() => users.id),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ── Conversation Participants ──────────────────────────────────────

export const conversationParticipants = pgTable(
  'conversation_participants',
  {
    conversationId:      uuid('conversation_id').notNull()
                           .references(() => conversations.id, { onDelete: 'cascade' }),
    userId:              text('user_id').notNull().references(() => users.id),
    wantsPersistence:    boolean('wants_persistence').notNull().default(true),
    lastReadMessageId:   uuid('last_read_message_id'),
    lastReadAt:          timestamp('last_read_at'),
    joinedFromMessageId: uuid('joined_from_message_id'), // "joined here" UI marker
    joinedAt:            timestamp('joined_at').notNull().defaultNow(),
    leftAt:              timestamp('left_at'),
  },
  (t) => ({ pk: primaryKey({ columns: [t.conversationId, t.userId] }) })
);

// ── Messages ───────────────────────────────────────────────────────

export const messages = pgTable(
  'messages',
  {
    id:               uuid('id').primaryKey().defaultRandom(),
    conversationId:   uuid('conversation_id').notNull()
                        .references(() => conversations.id, { onDelete: 'cascade' }),
    senderId:         text('sender_id').notNull().references(() => users.id),

    // Encrypted directly with AEK
    encryptedContent: text('encrypted_content').notNull(),
    iv:               text('iv').notNull(),

    messageType:      messageTypeEnum('message_type').notNull().default('text'),
    replyToId:        uuid('reply_to_id'),
    forwardedFromConversationId: uuid('forwarded_from_conversation_id'),
    mentions:         text('mentions').array(),

    // System message metadata — plaintext, no sensitive content
    // e.g. { event: 'user_added', userId: '...' }
    // e.g. { event: 'expanded_from', conversationId: '...' }
    systemPayload:    jsonb('system_payload'),

    editedAt:         timestamp('edited_at'),
    editHistory:      jsonb('edit_history'),
    isDeleted:        boolean('is_deleted').notNull().default(false),
    deletedForAll:    boolean('deleted_for_all').notNull().default(false),
    deletedAt:        timestamp('deleted_at'),
    createdAt:        timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    convCreatedIdx: index('messages_conv_created_idx').on(t.conversationId, t.createdAt),
  })
);

// ── Message Media ──────────────────────────────────────────────────

export const messageMedia = pgTable('message_media', {
  id:           uuid('id').primaryKey().defaultRandom(),
  messageId:    uuid('message_id').notNull()
                  .references(() => messages.id, { onDelete: 'cascade' }),
  mediaUrl:     text('media_url').notNull(),    // Spaces private bucket key
  thumbnailUrl: text('thumbnail_url'),
  mediaType:    mediaTypeEnum('media_type').notNull(),
  fileName:     text('file_name'),
  mimeType:     text('mime_type').notNull(),
  fileSize:     integer('file_size'),
  duration:     integer('duration'),
  width:        integer('width'),
  height:       integer('height'),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
});

// ── Message Reactions ──────────────────────────────────────────────

export const messageReactions = pgTable(
  'message_reactions',
  {
    id:        uuid('id').primaryKey().defaultRandom(),
    messageId: uuid('message_id').notNull()
                 .references(() => messages.id, { onDelete: 'cascade' }),
    userId:    text('user_id').notNull().references(() => users.id),
    emoji:     text('emoji').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    uniqueReaction: uniqueIndex('unique_reaction_idx').on(t.messageId, t.userId, t.emoji),
  })
);

// ── Read Receipts ──────────────────────────────────────────────────

export const messageReadReceipts = pgTable(
  'message_read_receipts',
  {
    messageId: uuid('message_id').notNull()
                 .references(() => messages.id, { onDelete: 'cascade' }),
    userId:    text('user_id').notNull().references(() => users.id),
    readAt:    timestamp('read_at').notNull().defaultNow(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.messageId, t.userId] }) })
);

// ── Pinned Messages ────────────────────────────────────────────────

export const pinnedMessages = pgTable(
  'pinned_messages',
  {
    conversationId: uuid('conversation_id').notNull()
                      .references(() => conversations.id, { onDelete: 'cascade' }),
    messageId:      uuid('message_id').notNull()
                      .references(() => messages.id, { onDelete: 'cascade' }),
    pinnedBy:  text('pinned_by').notNull().references(() => users.id),
    pinnedAt:  timestamp('pinned_at').notNull().defaultNow(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.conversationId, t.messageId] }) })
);

// ── Push Subscriptions ─────────────────────────────────────────────

export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id:          uuid('id').primaryKey().defaultRandom(),
    userId:      text('user_id').notNull()
                   .references(() => users.id, { onDelete: 'cascade' }),
    platform:    text('platform').notNull(), // 'web' | 'fcm' | 'apns'
    endpoint:    text('endpoint'),
    p256dh:      text('p256dh'),
    auth:        text('auth'),
    deviceToken: text('device_token'),
    deviceName:  text('device_name'),
    createdAt:   timestamp('created_at').notNull().defaultNow(),
    updatedAt:   timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({ userIdx: index('push_subscriptions_user_idx').on(t.userId) })
);

// ── Moderation Queue ───────────────────────────────────────────────

export const moderationQueue = pgTable('moderation_queue', {
  id:               uuid('id').primaryKey().defaultRandom(),
  messageId:        uuid('message_id').references(() => messages.id),
  reportedByUserId: text('reported_by_user_id').notNull().references(() => users.id),
  decryptedContent: text('decrypted_content').notNull(), // server decrypts via AEK
  reason:           text('reason').notNull(),
  status:           text('status').notNull().default('pending'),
  reviewedAt:       timestamp('reviewed_at'),
  createdAt:        timestamp('created_at').notNull().defaultNow(),
});

// ── E2E Tables — Phase 7 only, NOT used in Phase 1–6 ──────────────

export const userKeyBundles = pgTable('user_key_bundles', {
  userId:              text('user_id').primaryKey().references(() => users.id),
  identityPublicKey:   text('identity_public_key').notNull(),
  keySignature:        text('key_signature').notNull(),
  encryptedPrivateKey: text('encrypted_private_key'),
  privateKeyIv:        text('private_key_iv'),
  keyDerivationParams: jsonb('key_derivation_params'),
  createdAt:           timestamp('created_at').notNull().defaultNow(),
  updatedAt:           timestamp('updated_at').notNull().defaultNow(),
});

export const conversationMemberKeys = pgTable(
  'conversation_member_keys',
  {
    conversationId:    uuid('conversation_id').notNull()
                         .references(() => conversations.id, { onDelete: 'cascade' }),
    recipientId:       text('recipient_id').notNull().references(() => users.id),
    encryptedGroupKey: text('encrypted_group_key').notNull(),
    groupKeyIv:        text('group_key_iv').notNull(),
    keyVersion:        integer('key_version').notNull().default(1),
    createdAt:         timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.conversationId, t.recipientId] }) })
);
```

---

## 5. Conversation Types & Persistence

| Type | Persistence | Rule |
|---|---|---|
| `room_direct` | Ephemeral by default | Saved only if BOTH set `wantsPersistence = true` |
| `room_circle` | Always saved | No user choice |
| `connection` | Always saved | No user choice |

When `isPersisted = false` — messages delivered via Socket.IO only, never written to DB.

---

## 6. Connection DM History in Room

When two connections enter a Direct Room, their existing DM conversation is linked to the room. Full history visible — not a fresh conversation.

```typescript
// conversation.service.ts
async function getOrCreateRoomConversation(roomId: string, userA: string, userB: string) {
  const existing = await getConnectionConversation(userA, userB);

  if (existing) {
    // Link to this room — full DM history visible in room chat
    await db.update(conversations)
      .set({ roomId })
      .where(eq(conversations.id, existing.id));
    return existing;
  }

  // No prior DM — create fresh room_direct conversation
  return db.insert(conversations).values({
    type: 'room_direct',
    roomId,
    isPersisted: false,
  }).returning();
}
```

---

## 7. 1:1 → Circle Expansion

A **new conversation is created**. Original archived but accessible to original two users only.

### What Each Person Sees

```
Alice & Bob in new circle room:
  [📎 View previous 1:1 conversation]   ← banner, only Alice and Bob see this
  ── "Alice added Carol" ──
  msg: "hey carol!"

Carol:
  ── "Alice added Carol" ──              ← Carol starts here
  msg: "hey carol!"
  Carol NEVER sees the original 1:1 messages
```

### Server Implementation

```typescript
// room-expansion.service.ts
async function expandDirectToCircle(params: {
  conversationId: string;
  hostUserId: string;
  invitedUserId: string;
}) {
  const conv = await getConversation(params.conversationId);
  const originalRoom = await getRoomById(conv.roomId);
  await assertIsConnection(params.hostUserId, params.invitedUserId);

  return await db.transaction(async (tx) => {
    // 1. New circle room
    const newRoomId = crypto.randomUUID();
    await tx.insert(rooms).values({
      id: newRoomId, roomType: 'circle',
      hostUserId: params.hostUserId, status: 'live',
      categoryId: originalRoom.categoryId, title: originalRoom.title,
    });

    // 2. Copy existing participants + add Carol
    const existing = await getActiveParticipants(tx, originalRoom.id);
    for (const p of existing) {
      await tx.insert(roomParticipants).values({
        roomId: newRoomId, userId: p.userId,
        role: p.userId === params.hostUserId ? 'host' : 'participant',
      });
    }
    await tx.insert(roomParticipants).values({
      roomId: newRoomId, userId: params.invitedUserId, role: 'participant',
    });

    // 3. End old room
    await tx.update(rooms)
      .set({ status: 'ended', endedAt: new Date() })
      .where(eq(rooms.id, originalRoom.id));

    // 4. New circle conversation
    const newConversationId = crypto.randomUUID();
    await tx.insert(conversations).values({
      id: newConversationId, type: 'room_circle',
      roomId: newRoomId, isPersisted: true,
      parentConversationId: params.conversationId,
      expandedAt: new Date(), expandedByUserId: params.hostUserId,
    });

    // 5. Add all participants
    const allUsers = [...existing.map(p => p.userId), params.invitedUserId];
    for (const uid of allUsers) {
      await tx.insert(conversationParticipants).values({
        conversationId: newConversationId, userId: uid, wantsPersistence: true,
      });
    }

    // 6. System message + Carol's join marker
    const [sysMsg] = await tx.insert(messages).values({
      conversationId: newConversationId,
      senderId: params.hostUserId,
      encryptedContent: '', iv: '',
      messageType: 'system',
      systemPayload: { event: 'expanded_from', conversationId: params.conversationId },
    }).returning();

    await tx.update(conversationParticipants)
      .set({ joinedFromMessageId: sysMsg.id })
      .where(and(
        eq(conversationParticipants.conversationId, newConversationId),
        eq(conversationParticipants.userId, params.invitedUserId)
      ));

    return { newRoomId, newConversationId };
  });
}
```

### Client Migration

```typescript
socket.on('chat:expansion:complete', async (data) => {
  await rtcSession.leave();
  const { token } = await apiClient.post(`/api/room/${data.newRoomId}/rtc-token`);
  await rtcSession.joinRoom(data.newRoomId, token);
  router.replace(`/room/${data.newRoomId}`);
});
```

---

## 8. Adding People to Existing Circle

No new conversation. New person sees **all previous circle history**.

```typescript
async function addToExistingCircle(
  conversationId: string,
  hostUserId: string,
  invitedUserId: string
) {
  await assertIsConnection(hostUserId, invitedUserId);

  await db.transaction(async (tx) => {
    const [sysMsg] = await tx.insert(messages).values({
      conversationId, senderId: hostUserId,
      messageType: 'system', encryptedContent: '', iv: '',
      systemPayload: { event: 'user_added', userId: invitedUserId },
    }).returning();

    await tx.insert(conversationParticipants).values({
      conversationId, userId: invitedUserId,
      wantsPersistence: true,
      joinedFromMessageId: sysMsg.id,
    });
  });
}
```

```
Circle: Alice, Bob, Carol — 100 messages
  → Alice adds Dave
  → Dave sees all 100 messages + all future messages
  → "Alice added Dave" marker shows entry point visually
```

---

## 9. NSFW Detection

**Text → No scan. Report system handles abuse.**
**Media → Client-side nsfwjs only, before upload. No server scanning.**

```typescript
// client/src/features/chat/services/nsfw-scanner.service.ts
import * as nsfwjs from 'nsfwjs';

let model: nsfwjs.NSFWJS | null = null;

export async function scanMediaBeforeUpload(file: File): Promise<boolean> {
  if (!model) model = await nsfwjs.load();
  const img = await createImageBitmap(file);
  const predictions = await model.classify(img as unknown as HTMLImageElement);
  return predictions.some(p =>
    ['Porn', 'Hentai'].includes(p.className) && p.probability > 0.70 ||
    p.className === 'Sexy' && p.probability > 0.85
  );
}

// In use-media-upload.ts
async function uploadMedia(file: File) {
  const isNSFW = await scanMediaBeforeUpload(file);
  if (isNSFW) {
    showError('This media cannot be sent');
    return; // never reaches server, never stored in Spaces
  }
  // proceed with Spaces upload
}
```

**Text abuse → report system:**
```
User taps Report
  → POST /api/chat/report { messageId, reason }
  → Server decrypts message using AEK
  → Writes plaintext to moderation_queue
  → Moderation team reviews
```

---

## 10. Server Module Structure

```
server/src/
├── core/
│   ├── crypto/
│   │   ├── aek-loader.ts         ← loads AEK from Doppler/AWS, getAEK()
│   │   └── message-crypto.ts     ← encryptMessage, decryptMessage
│   ├── queue/
│   │   ├── queues.ts
│   │   └── workers/
│   │       ├── push-notification.worker.ts
│   │       ├── media-cleanup.worker.ts
│   │       └── read-receipt.worker.ts
│   └── redis/keys.ts
├── modules/chat/
│   ├── router.ts
│   ├── controllers/
│   │   ├── conversations.controller.ts
│   │   ├── messages.controller.ts
│   │   └── push.controller.ts
│   ├── services/
│   │   ├── conversation.service.ts    ← create, isPersisted, DM→room linking
│   │   ├── message.service.ts         ← persist, paginate, soft-delete, edit
│   │   ├── push.service.ts
│   │   ├── media.service.ts           ← presign upload, signed download URLs
│   │   └── room-expansion.service.ts  ← expandDirectToCircle, addToExistingCircle
│   ├── socket/chat.socket.ts
│   └── schemas/chat.schemas.ts
└── scripts/
    └── rotate-aek.ts
```

---

## 11. Socket.IO Events

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `chat:room:join` | conversationId | Join socket room |
| `chat:room:leave` | conversationId | Leave socket room |
| `chat:message:send` | conversationId, content, messageType, replyToId?, mentions? | Plaintext over TLS — server encrypts with AEK |
| `chat:message:read` | messageId, conversationId | Mark read — Redis unread reset |
| `chat:typing:start` | conversationId | Redis TTL 3s |
| `chat:typing:stop` | conversationId | DEL Redis key |
| `chat:reaction:add` | messageId, conversationId, emoji | Add reaction |
| `chat:reaction:remove` | messageId, conversationId, emoji | Remove reaction |
| `chat:message:edit` | messageId, conversationId, content | Server re-encrypts with AEK |
| `chat:message:delete` | messageId, conversationId, deleteForAll | Soft delete |
| `chat:expansion:request` | conversationId, invitedUserId | Host requests to add person |
| `chat:expansion:respond` | conversationId, invitedUserId, accepted | Peer responds |

### Server → Client

| Event | Description |
|---|---|
| `chat:message:new` | New message — server decrypts, sends plaintext over TLS |
| `chat:message:delivered` | Socket ACK |
| `chat:message:read` | Double tick update |
| `chat:message:edited` | Content updated |
| `chat:message:deleted` | Deleted — deletedForAll flag |
| `chat:typing:start/stop` | Typing indicator |
| `chat:reaction:update` | Full reactions list for message |
| `chat:pin:update` | Pinned messages changed |
| `chat:conversation:new` | New DM started with you |
| `chat:expansion:incoming` | Peer requesting to add someone |
| `chat:expansion:complete` | Expansion approved — migrate to new room |
| `chat:warning` | RATE_LIMITED |
| `chat:error` | UNAUTHORIZED, INTERNAL_ERROR |

---

## 12. HTTP API Endpoints

```
# Conversations
GET    /api/chat/conversations
GET    /api/chat/conversations/:id
GET    /api/chat/conversations/:id/messages   ← server decrypts with AEK
POST   /api/chat/conversations/connection     ← 403 if not accepted connections
PATCH  /api/chat/conversations/:id/persistence

# Messages
DELETE /api/chat/messages/:id
       Body: { deleteForAll: boolean }
POST   /api/chat/messages/:id/pin
DELETE /api/chat/messages/:id/pin
POST   /api/chat/report
       Body: { messageId, reason }
       → Server decrypts using AEK — no client plaintext needed

# Media
POST   /api/chat/media/presign
       Body: { conversationId, mediaType, fileName, fileSize, mimeType }
       → Returns: { uploadUrl, thumbnailUploadUrl, fileKey }

GET    /api/chat/link-preview?url=...
       → Server-side OG scrape — hides user IP from linked site

# Push
POST   /api/chat/push/subscribe
DELETE /api/chat/push/subscribe
GET    /api/chat/push/vapid-key

# Phase 7 E2E only — not active in Phase 1–6
GET    /api/chat/keys/me
GET    /api/chat/keys/:userId
POST   /api/chat/keys
PATCH  /api/chat/keys/me
GET    /api/chat/conversations/:id/keys
POST   /api/chat/conversations/:id/keys
```

---

## 13. Redis Layer

```typescript
// server/src/core/redis/keys.ts
CHAT_KEYS = {
  unreadCounts: (userId: string) =>
    `chat:unread:${userId}`,                    // HASH { convId → count }

  typingMember: (conversationId: string, userId: string) =>
    `chat:typing:${conversationId}:${userId}`,  // STRING, EX 3

  messageRate: (userId: string) =>
    `chat:rate:${userId}`,                      // STRING, INCR + EX 60

  onlineUsers: () =>
    `chat:online`,                              // SET of userId

  socketCount: (userId: string) =>
    `chat:socket-count:${userId}`,              // STRING, INCR/DECR
}
```

| Pattern | Implementation |
|---|---|
| Unread counts | `HINCRBY` on send; `HSET 0` on read; `HGETALL` on list load |
| Typing | `SET EX 3` on start; `DEL` on stop |
| Rate limit | `INCR`; `EXPIRE 60` on first; reject at >60/min |
| Online presence | `SADD` on connect; `SREM` when socket count hits 0 |
| Multi-instance pub/sub | `@socket.io/redis-adapter` — bridges all instances |

**Multi-instance setup:**

```typescript
import { createAdapter } from '@socket.io/redis-adapter';

const pubClient = createClient({ url: env.REDIS_URL });
const subClient = pubClient.duplicate();
await Promise.all([pubClient.connect(), subClient.connect()]);
io.adapter(createAdapter(pubClient, subClient));

// WebSocket only — no sticky sessions needed
const io = new Server(server, { transports: ['websocket'] });
```

**Rule: AEK is never stored in Redis. Redis is not a secrets store.**

---

## 14. Performance & Latency

### Per Message Server-Side

```
Auth check (JWT)            ~0ms    memory
Rate limit                  ~1ms    Redis
encryptMessage(AEK, text)   ~0.1ms  AEK already in RAM — just a Buffer read
Write to PostgreSQL         ~3-5ms  DB
Redis broadcast             ~1ms    pub/sub
─────────────────────────────────────
Total:                      ~5-7ms
```

### End to End

```
Same city:      ~25-30ms    feels instant
Same country:   ~60-70ms    feels real time
Cross country:  ~200ms+     slight delay

WhatsApp / Telegram:  ~50-100ms
Circlo:               ~50-90ms  ✓ same ballpark
```

### Optimistic UI

```typescript
// Sender sees message instantly — server confirms in background
// Dispatches into the Redux chat slice (RTK)
function sendMessage(conversationId: string, content: string) {
  const optimisticId = `temp_${Date.now()}`;

  dispatch(messageReceived({
    conversationId,
    message: { id: optimisticId, content, status: 'sending' },
  }));

  socket.emit('chat:message:send', { conversationId, content }, (ack) => {
    dispatch(messageUpdated({
      conversationId,
      message: {
        id: optimisticId,
        ...(ack.success ? { id: ack.messageId, status: 'delivered' } : { status: 'failed' }),
      },
    }));
  });
}
```

---

## 15. Multi-Instance Architecture

```
Load Balancer (nginx / fly.io)
  WebSocket only → no sticky sessions needed
        │
        ├── Instance 1 (Bun/Hono + Socket.IO)  ← AEK loaded from Doppler/AWS
        ├── Instance 2 (Bun/Hono + Socket.IO)  ← same AEK
        └── Instance 3 (Bun/Hono + Socket.IO)  ← same AEK
              │
              ├── Redis (shared)
              │     ├── Socket.IO pub/sub
              │     ├── Unread, typing, presence, rate limits
              │     └── AEK never stored here
              │
              └── PostgreSQL (shared)
                    └── All conversations and messages
```

**Why it works:**

```
AEK:        Same key loaded on every instance startup
            Any instance encrypts/decrypts identically

Messages:   Written to shared PostgreSQL
            Any instance reads and decrypts any message

Real-time:  Redis pub/sub via redis-adapter
            Message on Instance 1 → Bob on Instance 2 ✓

Rule:       Anything shared → Redis or PostgreSQL
            Never local memory, never a Map
```

---

## 16. Client-Side Architecture

```
client/src/features/chat/
├── components/
│   ├── chat-panel.tsx
│   ├── conversation-list.tsx
│   ├── message-list.tsx
│   ├── message-bubble.tsx
│   ├── message-input.tsx
│   ├── reaction-picker.tsx
│   ├── media-viewer.tsx
│   ├── typing-indicator.tsx
│   ├── chat-filter-bar.tsx
│   └── previous-conversation-banner.tsx  ← "View previous 1:1" banner
├── hooks/
│   ├── use-chat.ts               ← send, receive, optimistic updates
│   ├── use-conversation.ts       ← load + paginate messages
│   ├── use-typing.ts             ← debounced emit
│   └── use-media-upload.ts       ← nsfwjs check + Spaces upload
├── services/
│   └── nsfw-scanner.service.ts   ← nsfwjs image pre-upload only
├── slices/
│   └── chat.slice.ts
├── pages/
│   └── messages-page.tsx
└── types/chat.types.ts

// Phase 7 only — not in Phase 1–6:
// services/crypto.service.ts
// services/key-store.service.ts
// services/key-sync.service.ts
```

### State Management — Three-Layer Split

The chat system splits state across three layers. Each layer owns what it's best at.

```
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 1 — RTK Query (server state + cache)                         │
│                                                                     │
│  • Conversation list       GET /api/chat/conversations              │
│  • Message history         GET /api/chat/conversations/:id/messages │
│  • Automatic cache tags — invalidated on mutation                   │
│  • Cursor pagination handled per-endpoint                           │
│  • Socket events inject directly into this cache (no duplication)  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 2 — Redux Slice (real-time ephemeral state)                  │
│                                                                     │
│  • Typing indicators       socket-driven, TTL 3s                   │
│  • Unread counts           socket-driven, reset on read            │
│  • Online presence         socket-driven                           │
│  • Optimistic message IDs  temp_* → real ID swap on ack            │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 3 — Local useState (pure UI state)                           │
│                                                                     │
│  • Input text value        resets on send                          │
│  • Reply-to selection      cleared after send                      │
│  • Context menu open/pos   per message bubble                      │
│  • Scroll position         managed in message-list.tsx             │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Layer 1 — RTK Query: Chat API

```typescript
// client/src/features/chat/api/chat-api.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const chatApi = createApi({
  reducerPath: 'chatApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/chat', credentials: 'include' }),
  tagTypes: ['Conversation', 'Messages'],

  endpoints: (builder) => ({
    listConversations: builder.query<Conversation[], void>({
      query: () => '/conversations',
      providesTags: ['Conversation'],
    }),

    getMessages: builder.query<MessagesPage, { conversationId: string; cursor?: string }>({
      query: ({ conversationId, cursor }) =>
        `/conversations/${conversationId}/messages${cursor ? `?cursor=${cursor}` : ''}`,
      providesTags: (_r, _e, { conversationId }) => [{ type: 'Messages', id: conversationId }],

      // Merge pages — older messages prepended when user scrolls up
      serializeQueryArgs: ({ queryArgs }) => queryArgs.conversationId,
      merge: (cache, incoming) => {
        cache.messages.unshift(...incoming.messages);
        cache.nextCursor = incoming.nextCursor;
      },
      forceRefetch: ({ currentArg, previousArg }) =>
        currentArg?.cursor !== previousArg?.cursor,
    }),

    sendMessage: builder.mutation<Message, { conversationId: string; content: string; messageType?: string; replyToId?: string }>({
      // Fire-and-forget — socket delivers the real event back.
      // Only used for REST fallback. Primary path is socket.emit.
      query: (body) => ({ url: '/messages', method: 'POST', body }),
    }),

    setPersistence: builder.mutation<void, { conversationId: string; wantsPersistence: boolean }>({
      query: ({ conversationId, ...body }) => ({
        url: `/conversations/${conversationId}/persistence`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Conversation'],
    }),
  }),
});

export const {
  useListConversationsQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
  useSetPersistenceMutation,
} = chatApi;
```

---

### Layer 2 — Redux Slice: Real-Time Ephemeral State

Messages themselves live in the RTK Query cache. The slice owns only what sockets push that has no HTTP equivalent.

```typescript
// client/src/features/chat/slices/chat.slice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ChatState {
  typingState:      Record<string, Record<string, boolean>>; // convId → { userId → bool }
  unreadCounts:     Record<string, number>;                  // convId → count
  onlineUserIds:    string[];
  optimisticIds:    Record<string, string>;                  // tempId → real messageId
}

const initialState: ChatState = {
  typingState:   {},
  unreadCounts:  {},
  onlineUserIds: [],
  optimisticIds: {},
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    typingSet(state, action: PayloadAction<{ conversationId: string; userId: string; isTyping: boolean }>) {
      const { conversationId, userId, isTyping } = action.payload;
      state.typingState[conversationId] ??= {};
      state.typingState[conversationId][userId] = isTyping;
    },
    unreadIncrement(state, action: PayloadAction<string>) {
      state.unreadCounts[action.payload] = (state.unreadCounts[action.payload] ?? 0) + 1;
    },
    unreadReset(state, action: PayloadAction<string>) {
      state.unreadCounts[action.payload] = 0;
    },
    presenceUpdated(state, action: PayloadAction<string[]>) {
      state.onlineUserIds = action.payload;
    },
    optimisticIdResolved(state, action: PayloadAction<{ tempId: string; realId: string }>) {
      state.optimisticIds[action.payload.tempId] = action.payload.realId;
    },
  },
});

export const { typingSet, unreadIncrement, unreadReset, presenceUpdated, optimisticIdResolved } = chatSlice.actions;
export default chatSlice.reducer;
```

---

### Socket → RTK Query Cache Injection

New messages from the socket are injected directly into the RTK Query cache with `updateQueryData`. This avoids maintaining a parallel messages array in the slice — one source of truth.

```typescript
// client/src/features/chat/hooks/use-chat.ts
export function useChat(conversationId: string) {
  const dispatch = useAppDispatch();
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    // Inject new message directly into the RTK Query cache
    socket.on('chat:message:new', (msg: Message) => {
      dispatch(
        chatApi.util.updateQueryData('getMessages', { conversationId: msg.conversationId }, (draft) => {
          draft.messages.push(msg);
        })
      );
      // Also bump unread if the conversation isn't currently open
      if (msg.conversationId !== conversationId) {
        dispatch(unreadIncrement(msg.conversationId));
      }
    });

    socket.on('chat:message:edited', (msg: Message) => {
      dispatch(
        chatApi.util.updateQueryData('getMessages', { conversationId: msg.conversationId }, (draft) => {
          const idx = draft.messages.findIndex(m => m.id === msg.id);
          if (idx !== -1) Object.assign(draft.messages[idx], msg);
        })
      );
    });

    socket.on('chat:message:deleted', ({ messageId, conversationId: deletedInConversation, deletedForAll }) => {
      dispatch(
        chatApi.util.updateQueryData('getMessages', { conversationId: deletedInConversation }, (draft) => {
          const msg = draft.messages.find(m => m.id === messageId);
          if (msg) { msg.isDeleted = true; msg.deletedForAll = deletedForAll; }
        })
      );
    });

    socket.on('chat:typing:start', ({ conversationId: typingConversationId, userId }) =>
      dispatch(typingSet({ conversationId: typingConversationId, userId, isTyping: true }))
    );
    socket.on('chat:typing:stop', ({ conversationId: typingConversationId, userId }) =>
      dispatch(typingSet({ conversationId: typingConversationId, userId, isTyping: false }))
    );
    socket.on('chat:reaction:update', ({ messageId, conversationId: reactionConversationId, reactions }) => {
      dispatch(
        chatApi.util.updateQueryData('getMessages', { conversationId: reactionConversationId }, (draft) => {
          const msg = draft.messages.find(m => m.id === messageId);
          if (msg) msg.reactions = reactions;
        })
      );
    });

    return () => {
      socket.off('chat:message:new');
      socket.off('chat:message:edited');
      socket.off('chat:message:deleted');
      socket.off('chat:typing:start');
      socket.off('chat:typing:stop');
      socket.off('chat:reaction:update');
    };
  }, [socket, conversationId, dispatch]);
}
```

---

## 17. Scalability

| Resource | 1K Concurrent | 10K Concurrent | Notes |
|---|---|---|---|
| Socket.IO RAM | ~50 MB | ~500 MB | ~50KB per WebSocket |
| Server instances | 1 | 2–4 | Horizontal, behind LB |
| Redis ops/sec | ~5K | ~50K | Redis handles 100K+ |
| PostgreSQL writes | ~100/s | ~1K/s | Fine with indexes |
| PostgreSQL reads | ~500/s | ~5K/s | Add read replica at 5K+ |

### BullMQ Queues

| Queue | Purpose |
|---|---|
| `chat:push-notifications` | Web Push / FCM for offline users — never blocks socket |
| `chat:media:cleanup` | Delete Spaces files for deleted messages (24h delay) |
| `chat:read-receipts` | Batch-flush read receipts every 5s — 10× cheaper than individual inserts |

---

## 18. Security Summary

| Threat | Status | Mitigation |
|---|---|---|
| DB leak | ✓ Protected | Ciphertext only in DB. AEK never in DB. |
| Network interception | ✓ Protected | TLS everywhere. Plaintext never on wire. |
| Message tampering | ✓ Protected | GCM auth tag — tampered ciphertext fails decryption. |
| Code / git leak | ✓ Protected | AEK not in code, not in .env in git. |
| Brute force | ✓ Protected | AES-256 — computationally infeasible. |
| Unauthorized access | ✓ Protected | conversationParticipants checked on every request. |
| DM to non-connection | ✓ Protected | Connection assertion before DM creation. |
| NSFW media | ✓ Protected | nsfwjs client pre-upload scan. |
| Rate limiting | ✓ Protected | Redis INCR atomic across all instances. |
| Stale media URLs | ✓ Protected | Spaces signed URLs expire after 15 minutes. |
| Full server compromise | ✗ Accepted | AEK in RAM. Same tradeoff as Instagram, Discord, Slack. |
| Secrets manager breach | ✗ Accepted | Mitigated by MFA + audit logs on Doppler/AWS. |
| Insider threat | ✗ Accepted | Mitigated by access controls + least privilege. |

**Future upgrade path for accepted tradeoffs → Phase 7 E2E Secret Conversations.**

---

## 19. Dependencies

### Server
```json
"@socket.io/redis-adapter": "^8.x",
"bullmq": "^5.x",
"web-push": "^3.x"
```

### Client
```json
"nsfwjs": "^4.2.0"
```

### Removed — not needed
```
✗ @tensorflow-models/toxicity    no text scanning
✗ @tensorflow/tfjs on client     no text scanning
✗ @tensorflow/tfjs-node          no server media scanning
✗ OpenAI Moderation API          no server text scanning
✗ idb                            Phase 7 only
```

---

## 20. Implementation Phases

### Phase 1 — Foundation
- [ ] DB schema + migration (`chat.ts`)
- [ ] `aek-loader.ts` — Doppler stage, `loadAEKs()`, `getAEK()`
- [ ] `message-crypto.ts` — `encryptMessage`, `decryptMessage`
- [ ] `MESSAGE_ENCRYPTION_KEY` in Doppler: `openssl rand -hex 32`
- [ ] Server boot calls `loadAEKs()` before anything else
- [ ] Socket: `chat:room:join`, `chat:message:send`, `chat:message:new`
- [ ] `ChatPanel` component in room

### Phase 2 — Persistence
- [ ] `getOrCreateRoomConversation()` with DM history linking
- [ ] `isPersisted` logic + persistence preference endpoint
- [ ] Message history endpoint — cursor pagination + server decryption
- [ ] Redis unread counts + conversation list endpoint

### Phase 3 — Connection DMs & Offline
- [ ] Connection DM creation endpoint + `/messages` page
- [ ] Push subscriptions + BullMQ push notification worker
- [ ] Socket.IO Redis adapter for multi-instance

### Phase 4 — Chat Features
- [ ] Reactions, replies, edit + edit history, delete, pin
- [ ] Forward message — server decrypts + re-encrypts with AEK
- [ ] Mentions, typing indicators, voice messages, link previews
- [ ] Optimistic UI on client

### Phase 5 — Media & NSFW
- [ ] Media upload flow — Spaces presign + direct browser upload
- [ ] Client-side nsfwjs pre-upload check
- [ ] Report system → moderation queue

### Phase 6 — Expansion
- [ ] `expandDirectToCircle` + `addToExistingCircle`
- [ ] `systemPayload` + `joinedFromMessageId` in schema
- [ ] Previous conversation banner UI for Alice/Bob
- [ ] Client RTC migration on expansion complete

### Phase 7 — Secret Conversations (Future E2E, Optional)
- [ ] `isE2E` flag on conversations table
- [ ] Client Web Crypto — X25519 ECDH, AES-GCM, PBKDF2
- [ ] IndexedDB key storage + passphrase backup/restore
- [ ] `user_key_bundles` table + key endpoints
- [ ] 1:1 ECDH flow + GSK distribution for group E2E
- [ ] Lock icon UI + device pairing warnings

---

*Circlo Chat System Architecture — Single AEK + KMS. Production ready. Same security model as Instagram, Discord, Slack.*