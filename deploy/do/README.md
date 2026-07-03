# Greetup production deployment on DigitalOcean

**Region:** Bangalore (`BLR1`)  
**Domain:** `greetup.co` (production DNS cutover later)  
**Branch:** `main`  
**Architecture:** Hybrid — App Platform (client, server, matching) + Droplet (rtc + Redis) + Managed PostgreSQL + Spaces

Progress tracker: `deploy/do/PRODUCTION-STATUS.md`

---

## Architecture

| Service | Platform | Notes |
|---------|----------|-------|
| client | App Platform | Next.js, port `3000` |
| server | App Platform | API + WebSockets, port `5300` |
| matching-service | App Platform | Match worker, port `5060` |
| rtc-service | Droplet `greetup-rtc` | WebRTC UDP `40000–49999`, TCP `5370` |
| Redis | Same droplet as rtc | App Platform connects via VPC private IP |
| Postgres | Managed PostgreSQL `greetup-db` | Database `greetup_db`, PostGIS required |
| Images | Container Registry `greetup` | Basic plan, 4 repos |
| Files | Spaces | S3-compatible (`DO_SPACES_*` in server) |

```
                    ┌─────────────────────────────┐
                    │  App Platform (BLR1)        │
                    │  client / server / matching │
                    └──────────────┬──────────────┘
                                   │ VPC
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
  Managed PostgreSQL        greetup-rtc droplet         Spaces
  greetup_db + PostGIS      Redis + rtc-service
```

---

## Monthly cost (estimate)

| Item | ~$/mo |
|------|-------|
| Container Registry Basic | $5 |
| Managed PostgreSQL 1 GiB | $13–15 |
| Spaces | $5 |
| Droplet `greetup-rtc` 2 vCPU / 2 GiB | $24 |
| App Platform matching 512 MiB | $5 |
| App Platform server 1 GiB | $12 |
| App Platform client 1 GiB | $12 |
| **Total** | **~$76–78** |

Droplet can resize to 4 GiB ($32/mo) when video load increases.

---

## Phase 1 — Container Registry ✅

### Create registry

1. DO Console → **Container Registry** → **Create**
2. Name: `greetup`
3. Plan: **Basic ($5/mo)** — 5 repos, 5 GiB (need 4 images; Starter free = only 1 repo)

### Auth on laptop (Windows)

```powershell
winget install DigitalOcean.Doctl
doctl auth init          # paste API token
doctl registry login
```

If `doctl` not in PATH:

```powershell
$doctl = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\DigitalOcean.Doctl_Microsoft.Winget.Source_8wekyb3d8bbwe\doctl.exe"
& $doctl auth init
```

Alternative: `docker login registry.digitalocean.com` (username + password = API token).

### Build & push images (from repo root)

Images are built on the **laptop/CI**, not on the droplet. The droplet only **pulls** them.

```powershell
cd c:\path\to\circlo-2

# server
docker build -f server/Dockerfile -t registry.digitalocean.com/greetup/server:latest server/
docker push registry.digitalocean.com/greetup/server:latest

# matching-service
docker build -f matching-service/Dockerfile -t registry.digitalocean.com/greetup/matching-service:latest matching-service/
docker push registry.digitalocean.com/greetup/matching-service:latest

# rtc-service
docker build -f rtc-service/Dockerfile -t registry.digitalocean.com/greetup/rtc-service:latest rtc-service/
docker push registry.digitalocean.com/greetup/rtc-service:latest

# client (NEXT_PUBLIC_* required at build time)
docker build -f client/Dockerfile `
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://api-staging.greetup.co/api `
  --build-arg NEXT_PUBLIC_SOCKET_SERVER_URL=https://api-staging.greetup.co `
  --build-arg NEXT_PUBLIC_RTC_SOCKET_URL=https://rtc-staging.greetup.co `
  --build-arg NEXT_PUBLIC_APP_URL=https://staging.greetup.co `
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY=... `
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=... `
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID=... `
  --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=... `
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID=... `
  --build-arg NEXT_PUBLIC_GA_MEASUREMENT_ID=... `
  -t registry.digitalocean.com/greetup/client:latest client/
docker push registry.digitalocean.com/greetup/client:latest
```

**Image flow:** laptop `docker build` → `docker push` → registry → droplet/App Platform `pull`.

---

## Phase 2 — Managed PostgreSQL ✅

### Create cluster

| Field | Value |
|-------|-------|
| Engine | PostgreSQL **16** or **17** (PostGIS; avoid PG 18) |
| Region | BLR1 |
| VPC | `default-blr1` |
| Plan | 1 vCPU / 1 GiB (~$13–15/mo) |
| Cluster name | `greetup-db` |

### Create app database

Connect via pgAdmin or `psql` (public host, home IP in trusted sources).  
**Maintenance database:** `defaultdb` (not the cluster name `greetup-db`).

```sql
CREATE DATABASE greetup_db;
\c greetup_db
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Run migrations (laptop)

```powershell
cd server
$env:DATABASE_URL="postgresql://doadmin:PASSWORD@PUBLIC-HOST:25060/greetup_db?sslmode=no-verify"
bun run db:migrate
```

Use `sslmode=no-verify` from laptop if CA cert not configured. App Platform uses private URL with `sslmode=require`.

### Network access

- **Trusted sources:** home IP (migrations) + VPC CIDR (App Platform)
- Apps use **private** connection string from cluster Overview → VPC network tab

---

## Phase 3 — RTC Droplet ✅

### Create droplet

| Field | Value |
|-------|-------|
| Name | `greetup-rtc` |
| Region | BLR1 |
| Image | Ubuntu 24.04 LTS |
| Plan | Basic, Premium Intel, **$24/mo** (2 vCPU / 2 GiB) — resize to 4 GiB later if needed |
| VPC | `default-blr1` |
| IP | IPv4 enabled |
| Auth | SSH key (`ssh-ed25519`, e.g. `~/.ssh/greetup_do`) |

### SSH key (laptop, one-time)

```powershell
ssh-keygen -t ed25519 -C "greetup" -f $env:USERPROFILE\.ssh\greetup_do
Get-Content $env:USERPROFILE\.ssh\greetup_do.pub   # paste into DO → New SSH Key
```

### Firewall (`greetup-rtc-fw`)

**Inbound only** (leave outbound defaults — needed for `docker pull`, apt):

| Type | Protocol | Port | Sources |
|------|----------|------|---------|
| SSH | TCP | 22 | Home public IP only (`curl ifconfig.me` on laptop) |
| Custom | TCP | 80 | All IPv4, All IPv6 *(Let's Encrypt)* |
| Custom | TCP | 443 | All IPv4, All IPv6 *(HTTPS → Caddy → rtc)* |
| Custom | TCP | 5370 | VPC CIDR only *(server via private IP; browsers use 443)* |
| Custom | UDP | 40000–49999 | All IPv4, All IPv6 |
| Custom | TCP | 6379 | VPC CIDR only *(add before App Platform)* |

Attach firewall to `greetup-rtc`.

### VM setup

```bash
ssh -i ~/.ssh/greetup_do root@<DROPLET_PUBLIC_IP>

apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin
mkdir -p ~/greetup
```

Copy files from repo (or create on VM):

- `deploy/do/vm/docker-compose.yml` → `~/greetup/docker-compose.yml`
- `deploy/do/vm/Caddyfile` → `~/greetup/Caddyfile`
- `deploy/do/vm/.env.example` → `~/greetup/.env` (fill values)

```bash
# Generate secrets on VM
openssl rand -hex 16   # run 3x for REDIS_PASSWORD, INTERNAL_API_KEY, RTC_JWT_SECRET
curl -4 ifconfig.me    # VM_PUBLIC_IP
```

`.env` example:

```env
VM_PUBLIC_IP=<droplet-public-ipv4>
RTC_IMAGE=registry.digitalocean.com/greetup/rtc-service:latest
REDIS_PASSWORD=<secret>
INTERNAL_API_KEY=<secret>
RTC_JWT_SECRET=<secret>
```

**Important:** `RTC_IMAGE` tag must be exactly `latest` (not `latest1`). No spaces around `=` in `.env`.

### Start services

```bash
docker login registry.digitalocean.com   # API token as username + password

cd ~/greetup
docker compose --env-file .env pull
docker compose --env-file .env up -d
docker compose ps
docker compose logs rtc-service --tail 30
```

**Success logs:**

- `Redis connected`
- `mediasoup Worker created`
- `rtc-service listening on http://0.0.0.0:5370`
- Caddy obtains a Let's Encrypt cert for `rtc.greetup.co` (ports 80 + 443 open)

Browsers use **`https://rtc.greetup.co`** (port 443, TLS). Server still calls **`http://<VPC_PRIVATE_IP>:5370`** internally.

### Redeploy after code change

```powershell
# Laptop — rebuild & push
docker build -f rtc-service/Dockerfile -t registry.digitalocean.com/greetup/rtc-service:latest rtc-service/
docker push registry.digitalocean.com/greetup/rtc-service:latest
```

```bash
# VM
cd ~/greetup && docker compose --env-file .env pull && docker compose --env-file .env up -d
```

---

## Phase 4 — App Platform (TODO)

Create **three apps** from container images. Enable **VPC** (`default-blr1`) on each.

### Order

1. **matching-service**
2. **server**
3. **client**

### matching-service

| Setting | Value |
|---------|-------|
| Image | `registry.digitalocean.com/greetup/matching-service:latest` |
| HTTP port | `5060` |
| Size | 512 MiB ($5/mo) |
| VPC | Enabled |

```env
REDIS_URL=redis://:<REDIS_PASSWORD>@<RTC_PRIVATE_IP>:6379
INTERNAL_API_KEY=<same as rtc droplet .env>
MATCH_WEBHOOK_URL=https://api-staging.greetup.co/api/match/webhook
```

### server

| Setting | Value |
|---------|-------|
| Image | `registry.digitalocean.com/greetup/server:latest` |
| HTTP port | `5300` |
| Size | 1 GiB ($12/mo) |
| VPC | Enabled |

Key env vars (see `server/env/.env.example` for full list):

```env
PORT=5300
NODE_ENV=production
DATABASE_URL=postgresql://doadmin:...@PRIVATE-PG-HOST:25060/greetup_db?sslmode=require
REDIS_URL=redis://:<REDIS_PASSWORD>@<RTC_PRIVATE_IP>:6379
BETTER_AUTH_URL=https://api-staging.greetup.co
SERVER_URL=https://api-staging.greetup.co
WEB_CLIENT_HOST=https://staging.greetup.co
AUTH_COOKIE_DOMAIN=greetup.co
RTC_SERVICE_URL=http://<RTC_PRIVATE_IP>:5370
MATCH_ENGINE_URL=<matching-app-platform-url>
INTERNAL_API_KEY=...
RTC_JWT_SECRET=...
BETTER_AUTH_SECRET=...
FIREBASE_SERVICE_ACCOUNT_JSON=...
# Mailjet, Google OAuth, Gemini, DO_SPACES_*, etc.
```

### client

| Setting | Value |
|---------|-------|
| Image | `registry.digitalocean.com/greetup/client:latest` |
| HTTP port | `3000` |
| Size | 1 GiB ($12/mo) |

`NEXT_PUBLIC_*` must be set at **docker build** time (see Phase 1), not only at runtime.

---

## Phase 5 — Spaces (TODO)

1. **Spaces** → Create → BLR1, e.g. `greetup-assets`
2. API keys → server env: `DO_SPACES_KEY`, `DO_SPACES_SECRET`, `DO_SPACES_BUCKET`, `DO_SPACES_REGION`, `DO_SPACES_ENDPOINT`

---

## Phase 6 — DNS & cutover (TODO)

Test on staging first:

| Host | Type | Target |
|------|------|--------|
| `staging.greetup.co` | CNAME | App Platform client |
| `api-staging.greetup.co` | CNAME | App Platform server |
| `rtc-staging.greetup.co` | A | Rtc droplet public IP |

Production cutover only after staging passes. Lower DNS TTL 24–48h before switch.

---

## Phase 7 — CI/CD (GitHub Actions)

Workflows in `.github/workflows/`:

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Pull requests to `main` | Typecheck, lint, tests |
| `deploy-prod.yml` | Push to `main` | Build → DO registry → App Platform + rtc droplet |

### One-time GitHub setup

**Secrets** (Settings → Secrets and variables → Actions → Secrets):

| Secret | Purpose |
|--------|---------|
| `DIGITALOCEAN_ACCESS_TOKEN` | DO API token — registry login + `doctl` |
| `RTC_SSH_PRIVATE_KEY` | Private key for `root@greetup-rtc` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Client Docker build |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Client Docker build |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Client Docker build |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Client Docker build |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Client Docker build |
| `DATABASE_URL` | Managed Postgres URL (when migrations enabled) |

**Variables** (Settings → Secrets and variables → Actions → Variables):

| Variable | Example / notes |
|----------|-----------------|
| `DO_APP_ID_CLIENT` | App Platform app UUID for client |
| `DO_APP_ID_SERVER` | App Platform app UUID for server |
| `DO_APP_ID_MATCHING` | App Platform app UUID for matching-service |
| `RTC_DROPLET_HOST` | Public IPv4 of `greetup-rtc` |
| `RUN_DB_MIGRATIONS` | `true` to run `bun run db:migrate` on each deploy |

Find App Platform IDs:

```powershell
doctl apps list --format ID,Spec.Name
```

Ensure each App Platform app uses images from `registry.digitalocean.com/greetup/<service>:latest` with **Autodeploy** enabled (or rely on `doctl apps create-deployment` in the workflow).

Grant the DO API token **read/write** on Container Registry and App Platform.

### Deploy flow

1. Push to `main`
2. CI checks pass (typecheck, lint, tests)
3. Build all four images → push `:latest` and `:<git-sha>` to `registry.digitalocean.com/greetup`
4. Trigger App Platform redeploy for client, server, matching-service
5. SSH to rtc droplet → `docker compose pull && up -d`
6. Optional: run DB migrations when `RUN_DB_MIGRATIONS=true`

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `doctl` not found after winget | Use full path or reopen PowerShell; add to PATH |
| pgAdmin `database greetup-db does not exist` | Use `defaultdb` or `greetup_db`, not cluster name |
| Migration `SELF_SIGNED_CERT_IN_CHAIN` | `?sslmode=no-verify` from laptop, or download DO CA cert |
| `VM_PUBLIC_IP variable is not set` | Create `~/greetup/.env`; check no `latest1` typo |
| `rtc-service:latest1 not found` | Fix tag to `:latest` in `.env` |
| App can't reach Redis | Firewall TCP 6379 from VPC only; Redis `--bind 0.0.0.0`; use private IP in `REDIS_URL` |
| SSH fails after IP change | Update firewall SSH rule with new home IP, or use DO web console |

---

## Why not Functions?

DO **Functions** = short serverless handlers. Not for Next.js SSR, WebSockets, Redis `BRPOP` workers, or WebRTC. Use **App Platform** + **Droplet**.

---

## Legacy

GCP setup remains in `deploy/gcp/` until production cutover and decommission.
