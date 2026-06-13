# GCP production deployment

**Project:** `greetup-production-498717`  
**Region:** `asia-south1` (Mumbai)  
**Domain:** `greetup.co`  
**Branch:** `main`

## Architecture

| Service | Platform | Data store |
|---|---|---|
| client | Cloud Run | — |
| server | Cloud Run | Neon Postgres |
| matching-service | Cloud Run (private) | Upstash Redis |
| rtc-service | GCE VM | Upstash Redis |

Postgres and Redis run on **Neon** and **Upstash** — not on the VM. The VM only runs `rtc-service` (WebRTC needs UDP).

## One-time GCP setup

```bash
gcloud config set project greetup-production-498717

gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  compute.googleapis.com

gcloud artifacts repositories create greetup \
  --repository-format=docker \
  --location=asia-south1 \
  --description="Greetup production images"
```

Create a `cloud-build-sa` service account with: Cloud Run Admin, Artifact Registry Writer, Storage Object Creator, Logging Log Writer, Compute Instance Admin, Service Account User.

## Managed services (outside GCP)

- **Neon** — production Postgres → `DATABASE_URL` in Secret Manager
- **Upstash** — production Redis → `REDIS_URL` in Secret Manager (used by server, matching-service, rtc-service)

Run migrations once against Neon:

```bash
cd server
DATABASE_URL="<neon-connection-string>" bun run db:migrate
```

## GCE VM (rtc-service only)

```bash
gcloud compute instances create greetup-vm \
  --zone=asia-south1-a \
  --machine-type=e2-medium \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud
```

Firewall rules (ingress):

- TCP `5370` — rtc HTTP/WebSocket
- UDP `40000-49999` — WebRTC media

On the VM, copy `deploy/gcp/vm/docker-compose.yml` and `deploy/gcp/vm/.env.example` → `~/greetup/.env`, fill values, then:

```bash
cd ~/greetup
docker compose --env-file .env up -d
```

After each rtc image build:

```bash
docker compose --env-file .env pull
docker compose --env-file .env up -d
```

## Cloud Build configs

| Service | Config |
|---|---|
| client | `deploy/gcp/cloudbuild.client.yaml` |
| server | `deploy/gcp/cloudbuild.server.yaml` |
| matching-service | `deploy/gcp/cloudbuild.matching.yaml` |
| rtc-service | `deploy/gcp/cloudbuild.rtc.yaml` |

Manual deploy from repo root:

```bash
gcloud builds submit --config deploy/gcp/cloudbuild.server.yaml .
```

## Cloud Build triggers (CI/CD)

Connect GitHub repo to project `greetup-production-498717`. Create one trigger per service on branch `main`:

| Trigger | Config | Path filter |
|---|---|---|
| greetup-client | `deploy/gcp/cloudbuild.client.yaml` | `client/**` |
| greetup-server | `deploy/gcp/cloudbuild.server.yaml` | `server/**` |
| greetup-matching-service | `deploy/gcp/cloudbuild.matching.yaml` | `matching-service/**` |
| greetup-rtc-service | `deploy/gcp/cloudbuild.rtc.yaml` | `rtc-service/**` |

### Client trigger substitutions

`NEXT_PUBLIC_*` URLs are baked at build time. Set on the trigger (names must include leading `_`):

- `_NEXT_PUBLIC_API_BASE_URL` = `https://api.greetup.co/api`
- `_NEXT_PUBLIC_SOCKET_SERVER_URL` = `https://api.greetup.co`
- `_NEXT_PUBLIC_RTC_SOCKET_URL` = `https://rtc.greetup.co`
- `_NEXT_PUBLIC_APP_URL` = `https://greetup.co`
- `_NEXT_PUBLIC_FIREBASE_*` = Firebase Web app config
- `_NEXT_PUBLIC_GA_MEASUREMENT_ID` = Google Analytics 4 measurement ID (e.g. `G-CK6WRFYXTS`)

## Cloud Run runtime config

Attach secrets from Secret Manager after first deploy. Key values:

**server**

```
BETTER_AUTH_URL=https://api.greetup.co
SERVER_URL=https://api.greetup.co
WEB_CLIENT_HOST=https://greetup.co
AUTH_COOKIE_DOMAIN=greetup.co
RTC_SERVICE_URL=http://<VM_IP>:5370
MATCH_ENGINE_URL=https://<matching-service-url>
```

**matching-service**

```
MATCH_WEBHOOK_URL=https://api.greetup.co/api/match/webhook
```

Grant server access to invoke private matching-service:

```bash
gcloud run services add-iam-policy-binding matching-service \
  --region=asia-south1 \
  --member="serviceAccount:923071310461-compute@developer.gserviceaccount.com" \
  --role="roles/run.invoker"
```

## DNS

| Host | Target |
|---|---|
| `greetup.co` | Cloud Run `client` |
| `api.greetup.co` | Cloud Run `server` |
| `rtc.greetup.co` | VM external IP |
