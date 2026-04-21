# Greetup Deployment Guide

## Architecture Overview

| Service | Platform | Notes |
|---|---|---|
| client | Cloud Run | Next.js frontend |
| server | Cloud Run | Main API server |
| matching-service | Cloud Run | Private, authenticated only |
| rtc-service | GCE VM | WebRTC/mediasoup — cannot use Cloud Run (needs UDP) |
| postgres | GCE VM (Docker) | Same VM as rtc-service |
| redis | GCE VM (Docker) | Same VM as rtc-service |

## GCP Project

- **Project:** `greetup-development`
- **Region:** `us-central1`
- **Artifact Registry repo:** `greetup`

## Service Accounts

- **cloud-build-sa@greetup-development.iam.gserviceaccount.com**
  - Used by all Cloud Build triggers
  - Roles: Artifact Registry Writer, Cloud Run Admin, Storage Object Creator, Logging Log Writer
  - Also has `iam.serviceAccountUser` on the default compute service account

## Cloud Build Triggers

| Trigger | Config File | Branch |
|---|---|---|
| greetup-client | `deploy/gcp/cloudbuild.client.yaml` | development |
| greetup-server | `deploy/gcp/cloudbuild.server.yaml` | development |
| greetup-matching-service | `deploy/gcp/cloudbuild.matching.yaml` | development |
| greetup-rtc-service | `deploy/gcp/cloudbuild.rtc.yaml` | development |

## GCE VM Setup

- **Name:** `greetup-vm`
- **Machine type:** `e2-medium`
- **OS:** Ubuntu 22.04 LTS
- **Region:** `us-central1`

### Firewall Rules
- `allow-rtc`: TCP port `5370` (rtc-service HTTP/WebSocket)
- `allow-webrtc-udp`: UDP ports `40000-49999` (mediasoup media)
- `allow-redis`: TCP port `6379` (Redis — required for Cloud Run server access)
- `allow-postgres`: TCP port `5432` (PostgreSQL — required for Cloud Run server access)

### VM Services (docker compose)
Files located at `~/greetup/` on the VM.

```bash
# Start all services
docker compose --env-file ~/greetup/.env up -d

# Update rtc-service after new build
docker compose --env-file ~/greetup/.env pull
docker compose --env-file ~/greetup/.env up -d

# Check logs
docker logs greetup-rtc-service-1 --tail 50
docker logs greetup-postgres-1 --tail 50
docker logs greetup-redis-1 --tail 50
```

### VM .env Variables
```
POSTGRES_USER=greetup
POSTGRES_PASSWORD=<strong password>
POSTGRES_DB=greetup
REDIS_PASSWORD=<strong password>
VM_PUBLIC_IP=<vm external ip>
RTC_IMAGE=us-central1-docker.pkg.dev/greetup-development/greetup/rtc-service:latest
INTERNAL_API_KEY=<random 32 char hex>
RTC_JWT_SECRET=<random 32 char hex>
```

## Connection Strings (for Cloud Run env vars)

```
DATABASE_URL=postgresql://greetup:<POSTGRES_PASSWORD>@<VM_PUBLIC_IP>:5432/greetup
REDIS_URL=redis://:<REDIS_PASSWORD>@<VM_PUBLIC_IP>:6379
RTC_SERVICE_URL=http://<VM_PUBLIC_IP>:5370
```

## Cloud Run Environment Variables

### server
```
PORT=5300
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=https://<server-cloud-run-url>
WEB_CLIENT_HOST=https://<client-cloud-run-url>
REDIS_URL=
INTERNAL_API_KEY=
MATCH_ENGINE_URL=https://<matching-service-url>
RTC_JWT_SECRET=
RESEND_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
RTC_SERVICE_URL=http://<VM_PUBLIC_IP>:5370
MESSAGE_ENCRYPTION_KEY=
GEMINI_API_KEY=
DO_SPACES_KEY=
DO_SPACES_SECRET=
DO_SPACES_BUCKET=
DO_SPACES_REGION=
DO_SPACES_ENDPOINT=
```

### matching-service
```
REDIS_URL=
INTERNAL_API_KEY=
MATCH_WEBHOOK_URL=https://<server-url>/api/match/webhook
```

### client
```
NEXT_PUBLIC_API_BASE_URL=https://<server-cloud-run-url>/api
NEXT_PUBLIC_SOCKET_SERVER_URL=https://<server-cloud-run-url>
NEXT_PUBLIC_RTC_SOCKET_URL=https://<VM_PUBLIC_IP>:5370
NEXT_PUBLIC_APP_URL=https://<client-cloud-run-url>
```

## Deployment Flow

### Cloud Run services (client, server, matching-service)
1. Push code to `development` branch
2. Manually run the Cloud Build trigger
3. Cloud Build builds Docker image, pushes to Artifact Registry, deploys to Cloud Run

### rtc-service (VM)
1. Push code to `development` branch
2. Run `greetup-rtc-service` Cloud Build trigger — builds and pushes image to Artifact Registry
3. SSH into VM → `docker compose --env-file ~/greetup/.env pull && docker compose --env-file ~/greetup/.env up -d`

## Errors Encountered & Fixes

### 1. Cloud Build logging error
**Error:** `if 'build.service_account' is specified, the build must specify logs_bucket or use CLOUD_LOGGING_ONLY`
**Fix:** Added `options: logging: CLOUD_LOGGING_ONLY` to all cloudbuild yaml files.

### 2. Substitution variables in wrong block
**Error:** `unknown field "_PORT" in google.devtools.cloudbuild.v1.BuildOptions`
**Fix:** Moved `_SERVICE`, `_PORT`, `_CPU`, etc. from `options` block back to `substitutions` block.

### 3. mediasoup build fails — python not found
**Error:** `executeCmd() failed: "python" -m pip install ... invoke — /bin/sh: python: not found`
**Fix:** Changed rtc-service Dockerfile from `oven/bun:1.3.11-alpine` to `oven/bun:1.3.11-slim` (Debian-based) and added `python3`, `python3-pip`, `build-essential`.

### 4. mediasoup invoke module not found
**Error:** `/usr/bin/python3: No module named invoke`
**Fix:** Pre-install invoke system-wide in Dockerfile: `RUN pip3 install invoke --break-system-packages`

### 5. rtc-service using tsx instead of bun
**Error:** `Cannot find module './cjs/index.cjs'`
**Fix:** Changed `package.json` start script from `tsx src/app.ts` to `bun src/app.ts`.

### 6. rtc-service can't connect to Redis
**Error:** `[ioredis] Unhandled error event: Connection is closed`
**Fix:** rtc-service uses `network_mode: host` so it can't resolve container hostnames. Changed `REDIS_URL` from `redis:6379` to `localhost:6379` in docker-compose.yml.

### 7. Postgres user not created
**Error:** `FATAL: role "greetup" does not exist`
**Fix:** The `.env` file had variables on the same line (missing newline). Fixed formatting, then ran `docker compose down -v` to wipe stale volumes and reinitialize postgres.

### 9. Server logging crash on Cloud Run
**Error:** `ENOENT: no such file or directory, open '/logs/combined.log'`
**Fix:** Changed production logger in `server/src/core/logging/index.ts` to use stdout (`pino(baseOptions)`) instead of writing to a file — Cloud Run has no persistent filesystem.

### 10. Redis/Postgres connection timeout from Cloud Run
**Error:** `connect ETIMEDOUT` on Redis and DB connections
**Fix:** Added VM firewall rules to open TCP ports `6379` (Redis) and `5432` (Postgres) so Cloud Run can reach the VM.

### 11. BETTER_AUTH_URL invalid
**Error:** `ERR_INVALID_URL` at startup
**Fix:** Ensure `BETTER_AUTH_URL` is a valid full URL like `https://server-xxxxxxxx-uc.a.run.app`

### 8. Cloud Build permission denied on Cloud Run deploy
**Error:** `Permission 'iam.serviceaccounts.actAs' denied on service account 215428488804-compute@developer.gserviceaccount.com`
**Fix:** Granted `iam.serviceAccountUser` role to `cloud-build-sa` on the default compute service account:
```bash
gcloud iam service-accounts add-iam-policy-binding \
  215428488804-compute@developer.gserviceaccount.com \
  --member="serviceAccount:cloud-build-sa@greetup-development.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser" \
  --project=greetup-development
```

## Next Steps

- [ ] Set environment variables in Cloud Run for server, client, matching-service
- [ ] Run server and matching-service triggers and verify deployments
- [ ] Run client trigger and verify deployment
- [ ] Set up DB migrations (run `drizzle-kit migrate` against the VM postgres)
- [ ] Configure custom domain (optional for staging)
- [ ] Add `latest` tag to rtc-service Cloud Build so VM update doesn't need manual SHA update
- [ ] Set up automatic CI/CD trigger on push to `development` branch
