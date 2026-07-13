# Greetup production deployment

## Architecture

| Service | Platform | Notes |
|---|---|---|
| client | Cloud Run (`asia-south1`) | Next.js — `greetup.co` |
| server | Cloud Run (`asia-south1`) | API — `api.greetup.co` |
| matching-service | Cloud Run (`asia-south1`) | Private, server-only |
| rtc-service | GCE VM (`asia-south1-a`) | WebRTC — needs UDP |
| Postgres | **Neon** | `DATABASE_URL` |
| Redis | **Upstash** | `REDIS_URL` |

Local development uses Docker Postgres/Redis (`docker-compose.dev.yml`). Production uses Neon + Upstash only.

## GCP project

- **Project ID:** `greetup-production-498717`
- **Project number:** `923071310461`
- **Region:** `asia-south1`
- **Artifact Registry:** `greetup`
- **Deploy branch:** `main`

## Cloud Build triggers

| Trigger | Config | Path filter |
|---|---|---|
| greetup-client | `deploy/gcp/cloudbuild.client.yaml` | `apps/client/**` |
| greetup-server | `deploy/gcp/cloudbuild.server.yaml` | `apps/server/**` |
| greetup-matching-service | `deploy/gcp/cloudbuild.matching.yaml` | `apps/matching-service/**` |
| greetup-rtc-service | `deploy/gcp/cloudbuild.rtc.yaml` | `apps/rtc-service/**` |

Push to `main` → matching trigger runs → build → Artifact Registry → Cloud Run (or VM pull for rtc).

## Secrets (Secret Manager)

| Secret | Source |
|---|---|
| `DATABASE_URL` | Neon connection string |
| `REDIS_URL` | Upstash connection string (`rediss://...`) |
| `INTERNAL_API_KEY` | Shared by server, matching, rtc |
| `BETTER_AUTH_SECRET` | Random 32+ chars |
| `RTC_JWT_SECRET` | Shared by server and rtc |
| OAuth, Mailjet, Gemini, storage | Prod credentials |

## VM (rtc only)

Files at `~/greetup/` on `greetup-vm` (`asia-south1-a`).

```bash
docker compose --env-file ~/greetup/.env up -d
docker compose --env-file ~/greetup/.env pull && docker compose --env-file ~/greetup/.env up -d
docker logs greetup-rtc-service-1 --tail 50
```

See `deploy/gcp/vm/.env.example`.

### Firewall

- TCP `5370` — rtc
- UDP `40000-49999` — WebRTC

No Postgres/Redis ports on the VM.

## Cloud Run environment

### server

```
PORT=5300
BETTER_AUTH_URL=https://api.greetup.co
SERVER_URL=https://api.greetup.co
WEB_CLIENT_HOST=https://greetup.co
AUTH_COOKIE_DOMAIN=greetup.co
MATCH_ENGINE_URL=https://<matching-service-url>
RTC_SERVICE_URL=http://<VM_IP>:5370
```

Plus secrets: `DATABASE_URL`, `REDIS_URL`, `BETTER_AUTH_SECRET`, `INTERNAL_API_KEY`, `RTC_JWT_SECRET`, OAuth, email, storage, etc.

### matching-service

```
MATCH_WEBHOOK_URL=https://api.greetup.co/api/match/webhook
REDIS_URL=<upstash>
INTERNAL_API_KEY=<secret>
```

### client

Public URLs are set at **build time** via Cloud Build trigger substitutions (`_NEXT_PUBLIC_*`), not Cloud Run env vars.

## Deployment flow

1. Push to `main`
2. Cloud Build builds image → Artifact Registry → deploys to Cloud Run
3. rtc trigger pushes `:latest` → SSH to VM → `docker compose pull && up -d`
4. Run DB migrations against Neon before or after first server deploy

## Custom domains

| Domain | Service |
|---|---|
| `greetup.co` | client |
| `api.greetup.co` | server |
| `rtc.greetup.co` | VM (DNS A record) |

Full setup details: `deploy/gcp/README.md`.
