# Greetup production go-live — step-by-step (DigitalOcean + Cloudflare)

**Last updated:** 2026-07-04  
**Region:** BLR1 (Bangalore)  
**Domains:** `greetup.co`, `api.greetup.co`, `rtc.greetup.co`

Sankshipt runbook for everything done during the GCP → DigitalOcean cutover. Full reference: `deploy/do/README.md`.

---

## Architecture (hybrid)

| Component | Platform | URL / access |
|-----------|----------|--------------|
| client | App Platform | `https://greetup.co` |
| server | App Platform | `https://api.greetup.co` |
| matching-service | App Platform | `https://greetup-matching-*.ondigitalocean.app` |
| rtc-service + Redis | Droplet `greetup-rtc` | Public `168.144.116.195`, VPC private IP for apps |
| Postgres | Managed `greetup-db` | `greetup_db` + PostGIS |

**DNS:** Cloudflare (new account) — **not** DigitalOcean Networking → Domains.

---

## Step 1 — Container Registry & images

1. Create DO Container Registry: `registry.digitalocean.com/greetup` (Basic).
2. Laptop: `doctl auth init` → `doctl registry login`.
3. Build & push from repo root:
   - `server`, `matching-service`, `rtc-service`, `client`
4. Client build **must** bake `NEXT_PUBLIC_*` at Docker build time (see Step 6).

---

## Step 2 — Managed PostgreSQL

1. Create cluster `greetup-db` (PG 16, BLR1).
2. Create database `greetup_db`.
3. Enable PostGIS.
4. VPC network access for App Platform.
5. Laptop: run migrations from `apps/server/` with `DATABASE_URL` (public host + trusted IP, or VPC).

---

## Step 3 — RTC droplet (`greetup-rtc`)

### 3.1 Droplet & firewall

1. Droplet: 2 vCPU / 2 GiB, BLR1, attach to VPC.
2. Firewall `greetup-rtc-fw` — inbound:
   - TCP 22 — home IP only
   - TCP 80, 443 — all (Caddy / Let's Encrypt)
   - TCP 5370 — VPC only (server internal)
   - TCP 6379 — VPC only (Redis for App Platform)
   - UDP 40000–49999 — all (WebRTC)

### 3.2 VM files (`~/greetup/`)

Copy from repo:

- `deploy/do/vm/docker-compose.yml`
- `deploy/do/vm/Caddyfile`
- `deploy/do/vm/.env` (from `.env.example`)

Generate secrets on VM:

```bash
openssl rand -hex 16   # ×3 → REDIS_PASSWORD, INTERNAL_API_KEY, RTC_JWT_SECRET
```

`.env` essentials:

```env
VM_PUBLIC_IP=<droplet-public-ipv4>
RTC_IMAGE=registry.digitalocean.com/greetup/rtc-service:latest
REDIS_PASSWORD=<secret>
INTERNAL_API_KEY=<secret>
RTC_JWT_SECRET=<secret>
```

### 3.3 Start services

```bash
cd ~/greetup
docker compose --env-file .env pull
docker compose --env-file .env up -d
docker compose ps
```

**CI/CD:** GitHub Actions pushes `rtc-service:latest` to the registry. **Watchtower** (in `docker-compose.yml`) polls every 5 minutes and recreates `rtc-service` — no SSH from GHA (firewall blocks port 22 except your home IP).

Ensure registry auth exists on the VM:

```bash
docker login registry.digitalocean.com   # API token as username + password
```

Expected containers: `redis`, `rtc-service`, `caddy`, `watchtower`.

- RTC health (internal): `http://127.0.0.1:5370/health`
- Public HTTPS (after Caddy + DNS): `https://rtc.greetup.co/health`

**Note:** `redis-cli` is not on the host — use `docker exec greetup-redis-1 redis-cli ...`.

---

## Step 4 — App Platform (deploy order)

Enable **VPC** on all three apps.

### 4.1 matching-service

| Setting | Value |
|---------|-------|
| Image | `registry.digitalocean.com/greetup/matching-service:latest` |
| Port | `5060` (DO may set `PORT=8080` at runtime — health via public URL) |
| VPC | On |

```env
REDIS_URL=redis://:<REDIS_PASSWORD>@<RTC_VPC_PRIVATE_IP>:6379
INTERNAL_API_KEY=<same as droplet + server>
MATCH_WEBHOOK_URL=https://api.greetup.co/internal
ROOM_SERVICE_URL=https://api.greetup.co/internal
MATCHING_ROOM_MODE=http
```

> **Important:** `MATCH_WEBHOOK_URL` must be `.../internal` — **not** `.../api/match/webhook`.  
> Code appends `/webhook/match-proposed` → wrong path caused 401.

### 4.2 server

| Setting | Value |
|---------|-------|
| Image | `registry.digitalocean.com/greetup/server:latest` |
| Port | `5300` |
| VPC | On |

```env
NODE_ENV=production
PORT=5300
DATABASE_URL=postgresql://doadmin:...@PRIVATE-PG:25060/greetup_db?sslmode=require
REDIS_URL=redis://:<REDIS_PASSWORD>@<RTC_VPC_PRIVATE_IP>:6379
BETTER_AUTH_URL=https://api.greetup.co
SERVER_URL=https://api.greetup.co
WEB_CLIENT_HOST=https://greetup.co
AUTH_COOKIE_DOMAIN=greetup.co
MATCH_ENGINE_URL=https://greetup-matching-<id>.ondigitalocean.app
RTC_SERVICE_URL=http://<RTC_VPC_PRIVATE_IP>:5370
INTERNAL_API_KEY=<same everywhere>
RTC_JWT_SECRET=<same as rtc droplet>
```

Custom domains: `api.greetup.co`.

### 4.3 client

| Setting | Value |
|---------|-------|
| Image | `registry.digitalocean.com/greetup/client:latest` |
| Port | `3000` |

Custom domains: `greetup.co`, `www.greetup.co`.

`NEXT_PUBLIC_*` at **docker build** (not runtime):

```env
NEXT_PUBLIC_API_BASE_URL=https://api.greetup.co/api
NEXT_PUBLIC_SOCKET_SERVER_URL=https://api.greetup.co
NEXT_PUBLIC_RTC_SOCKET_URL=https://rtc.greetup.co
NEXT_PUBLIC_APP_URL=https://greetup.co
```

---

## Step 5 — Cloudflare DNS

Use **Cloudflare** nameservers only (not DO Domains).

| Record | Type | Target | Proxy |
|--------|------|--------|-------|
| `@` | CNAME | `greetup-client-*.ondigitalocean.app` | Proxied (orange) |
| `www` | CNAME | same client app URL | Proxied |
| `api` | CNAME | `greetup-server-*.ondigitalocean.app` | Proxied |
| `rtc` | A | droplet public IP | **DNS only** (gray) |
| MX / TXT | — | unchanged (Google email) | DNS only |

---

## Step 6 — Cloudflare redirects (www + HTTPS)

Two settings together:

### 6.1 Always Use HTTPS

**SSL/TLS → Edge Certificates → Always Use HTTPS** = **On**

Handles: `http://*` → `https://*` (same hostname).

### 6.2 WWW → apex redirect rule

**Rules → Redirect Rules** (Single Redirect template: “Redirect from WWW to root”):

| Field | Value |
|-------|--------|
| Request URL | `https://www.greetup.co/*` |
| Target URL | `https://greetup.co/${1}` |
| Status | `301` |
| Preserve query string | On |

Full flow: `http://www.greetup.co/` → `https://www.greetup.co/` → `https://greetup.co/`

Verify:

```bash
curl -sI http://www.greetup.co/
curl -sI https://www.greetup.co/
```

Both should end with `location: https://greetup.co/`.

App-level backup exists in `apps/client/next.config.ts` and `apps/client/src/proxy.ts`.

---

## Step 7 — Issues encountered & fixes

### 7.1 Auth / login redirect loop

- Set `AUTH_COOKIE_DOMAIN=greetup.co` on server.
- Users must **re-register** on new Postgres (GCP users don't exist).
- Fresh login after deploy so cookies apply to `.greetup.co`.

### 7.2 Matching webhooks 401

**Symptom:** Logs show `https://api.greetup.co/api/match/webhook/webhook/match-proposed` → 401.

**Cause:** Double `/webhook/` — env had `MATCH_WEBHOOK_URL=.../api/match/webhook` but code uses `${MATCH_WEBHOOK_URL}/webhook/match-proposed`. Hits `/api` (session auth) instead of `/internal` (API key).

**Fix:** `MATCH_WEBHOOK_URL=https://api.greetup.co/internal` + matching `INTERNAL_API_KEY` = server.

### 7.3 Mock room URLs (`mock-room:...`)

**Symptom:** `/space/mock-room:userA:userB:attemptId` stuck on “Getting everything ready…”

**Cause:** `MATCHING_ROOM_MODE` defaults to `mock` — no real room in DB/Redis.

**Fix on matching-service:**

```env
MATCHING_ROOM_MODE=http
ROOM_SERVICE_URL=https://api.greetup.co/internal
```

### 7.4 Stuck “Already in an active session”

**Cause:** Stale `mm:state`, `mm:attempt`, `mm:user:last-attempt` in Redis after mock-room test.

**Fix — flush all Redis (nuclear, Postgres untouched):**

```bash
cd ~/greetup && source .env
docker exec greetup-redis-1 redis-cli -a "$REDIS_PASSWORD" --no-auth-warning FLUSHDB
docker exec greetup-redis-1 redis-cli -a "$REDIS_PASSWORD" --no-auth-warning DBSIZE   # → 0
```

**Or per-user cleanup:** delete `mm:state:*`, `mm:user:last-attempt:*`, `mm:attempt:*`, `user:active_rtc_room:*` for affected user IDs.

**Via app (logged in):** `POST /api/matching/leave-room` then `POST /api/matching/cancel`.

### 7.5 RTC HTTPS / Caddy

- Service listens on **5370**; browsers need **443**.
- Deploy `Caddyfile` + `caddy` service from `deploy/do/vm/docker-compose.yml`.
- Open firewall TCP 80 + 443 before Let's Encrypt can issue cert.
- Client must use `NEXT_PUBLIC_RTC_SOCKET_URL=https://rtc.greetup.co` (rebuild image).

### 7.6 Redis Insight from laptop

Redis is VPC-only — use SSH tunnel:

```powershell
ssh -i $env:USERPROFILE\.ssh\greetup_do -L 16379:127.0.0.1:6379 root@<DROPLET_IP> -N
```

Connect Redis Insight to `127.0.0.1:16379` with `REDIS_PASSWORD`.

### 7.7 VPC private IP change

If droplet VPC IP changes (e.g. `10.122.0.3` → `10.47.0.5`), update on App Platform:

- `REDIS_URL`
- `RTC_SERVICE_URL`

Check on droplet: `hostname -I`.

---

## Step 8 — Code fixes applied (repo)

Build blockers fixed before images could deploy:

- **client:** Image `src` types, spacing in open-now cards
- **server:** duplicate import in `otc-socket.service.ts`, Drizzle query in `open-to-connect-discovery.repository.ts`
- **deploy/do/vm:** Caddy + `docker-compose.yml` for `rtc.greetup.co` HTTPS

---

## Step 9 — Verification checklist

| Check | Command / action |
|-------|------------------|
| Client loads | `https://greetup.co` |
| www redirect | `curl -sI http://www.greetup.co/` → `https://greetup.co/` |
| API health | `https://api.greetup.co` |
| Matching health | `https://greetup-matching-*/health` → redis up |
| RTC health | `https://rtc.greetup.co/health` |
| Register + login | Fresh user on new DB |
| Find match | Two users → proposal UI (no webhook 401) |
| Room URL | Real UUID, not `mock-room:...` |
| Webhook test | `curl -X POST https://api.greetup.co/internal/webhook/match-proposed -H "x-internal-api-key: ..."` → not 401 |

---

## Step 10 — Still TODO

- [x] GitHub Actions CI/CD (`.github/workflows/ci.yml`, `deploy-prod.yml`)
- [ ] DO Spaces for profile photos (`DO_SPACES_*`)
- [ ] Deploy Caddy on droplet if only redis + rtc running (no `caddy` service yet)
- [ ] Decommission GCP after stable
- [ ] Update `deploy/do/PRODUCTION-STATUS.md` checklist

---

## Quick reference commands

```bash
# SSH droplet
ssh -i ~/.ssh/greetup_do root@168.144.116.195

# Redeploy rtc stack
cd ~/greetup && docker compose --env-file .env pull && docker compose --env-file .env up -d

# Redis flush (all ephemeral state)
source .env && docker exec greetup-redis-1 redis-cli -a "$REDIS_PASSWORD" --no-auth-warning FLUSHDB

# Redis CLI one-off
docker exec greetup-redis-1 redis-cli -a "$REDIS_PASSWORD" --no-auth-warning PING
```

---

## Related docs

- `deploy/do/README.md` — full setup guide
- `deploy/do/PRODUCTION-STATUS.md` — progress tracker
- `deploy/gcp/` — legacy (decommission after cutover)
