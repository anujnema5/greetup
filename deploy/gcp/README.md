# GCP deployment setup (GitHub -> GCP)

This folder contains Docker and Cloud Build configs for all 4 services.

**Development vs production (client):** the Next.js client bakes public URLs at build time. Use `cloudbuild.client.yaml` for **development** only; for **production** use `cloudbuild.client.production.yaml` and separate triggers—see `environments/README.md`.

- `client` -> Cloud Run
- `server` -> Cloud Run
- `matching-service` -> Cloud Run (private)
- `rtc-service` -> Compute Engine VM (image built by Cloud Build)

## 1) One-time project setup

Run once after creating your GCP project:

```bash
gcloud config set project YOUR_PROJECT_ID
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  compute.googleapis.com
```

Create artifact registry (Docker):

```bash
gcloud artifacts repositories create greetup \
  --repository-format=docker \
  --location=us-central1 \
  --description="Greetup service images"
```

## 2) Provision managed dependencies

- Cloud SQL Postgres (for `server`)
- Memorystore Redis (for `server`, `matching-service`, `rtc-service`)
- Secret Manager secrets for app configuration

At minimum, define and wire these secrets:

- `DATABASE_URL`
- `REDIS_URL`
- `INTERNAL_API_KEY`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `WEB_CLIENT_HOST`
- `RTC_JWT_SECRET`
- `MATCH_ENGINE_URL`
- `RTC_SERVICE_URL`

Then add remaining feature secrets your app requires (Google OAuth, email provider, object storage, etc).

## 3) Deploy Cloud Run services

From repo root, you can deploy each service with:

```bash
gcloud builds submit --config deploy/gcp/cloudbuild.client.yaml .
# Production client (after filling substitutions in the YAML or trigger):
# gcloud builds submit --config deploy/gcp/cloudbuild.client.production.yaml .
gcloud builds submit --config deploy/gcp/cloudbuild.server.yaml .
gcloud builds submit --config deploy/gcp/cloudbuild.matching.yaml .
```

After first deploy, attach runtime config (examples):

```bash
gcloud run services update server \
  --region us-central1 \
  --set-secrets DATABASE_URL=DATABASE_URL:latest,REDIS_URL=REDIS_URL:latest,INTERNAL_API_KEY=INTERNAL_API_KEY:latest,BETTER_AUTH_SECRET=BETTER_AUTH_SECRET:latest

gcloud run services update matching-service \
  --region us-central1 \
  --set-secrets REDIS_URL=REDIS_URL:latest,INTERNAL_API_KEY=INTERNAL_API_KEY:latest
```

Grant server access to call private matching-service:

```bash
gcloud run services add-iam-policy-binding matching-service \
  --region us-central1 \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/run.invoker"
```

## 4) Build RTC image

`rtc-service` is not deployed to Cloud Run in this setup. Build and push image with:

```bash
gcloud builds submit --config deploy/gcp/cloudbuild.rtc.yaml .
```

The rtc Cloud Build config also supports automatic VM sync during the trigger:
- copies `deploy/gcp/vm/docker-compose.yml` to `~/${_VM_APP_DIR}/docker-compose.yml` on the VM
- updates `RTC_IMAGE` in `~/${_VM_APP_DIR}/.env` to the new `:latest` image
- runs `docker compose --env-file .env pull && docker compose --env-file .env up -d --remove-orphans`
- verifies VM state after deploy (`postgres` container running, PostGIS image/version available)

Default substitutions in `deploy/gcp/cloudbuild.rtc.yaml`:
- `_VM_NAME=greetup-vm`
- `_VM_ZONE=us-central1-a`
- `_VM_USER=greetup_club`
- `_VM_APP_DIR=greetup`
- `_POSTGIS_IMAGE=postgis/postgis:16-3.4`

Required IAM for the Cloud Build service account used by the rtc trigger:
- `roles/compute.instanceAdmin.v1`
- `roles/iam.serviceAccountUser`
- `roles/compute.osAdminLogin` (if OS Login is enabled)

Use the pushed image manually on a Compute Engine VM (fallback):

```bash
docker run -d --name rtc-service \
  --restart unless-stopped \
  -p 5370:5370 \
  -e NODE_ENV=production \
  -e HOST=0.0.0.0 \
  -e PORT=5370 \
  -e REDIS_URL=YOUR_REDIS_URL \
  -e INTERNAL_API_KEY=YOUR_INTERNAL_KEY \
  -e RTC_JWT_SECRET=YOUR_RTC_JWT_SECRET \
  us-central1-docker.pkg.dev/YOUR_PROJECT_ID/greetup/rtc-service:TAG
```

Open firewall rules for your mediasoup UDP/TCP ranges from `rtc-service` env config.

## 5) Connect GitHub to auto-deploy

Create Cloud Build triggers (dev vs prod configs live in `*.yaml` vs `*.production.yaml`; see `environments/README.md`):

- `deploy/gcp/cloudbuild.client.yaml` / `cloudbuild.client.production.yaml`
- `deploy/gcp/cloudbuild.server.yaml` / `cloudbuild.server.production.yaml`
- `deploy/gcp/cloudbuild.matching.yaml` / `cloudbuild.matching.production.yaml`
- `deploy/gcp/cloudbuild.rtc.yaml` / `cloudbuild.rtc.production.yaml`

Suggested trigger paths:

- `client/**`
- `server/**`
- `matching-service/**`
- `rtc-service/**`

Use branch `development` for current dev deploys; add a **second** client trigger on `main` (or `production`) pointing at `cloudbuild.client.production.yaml` when you launch prod. Details: `environments/README.md`.

## 6) Recommended production defaults

- `server` Cloud Run min instances: `1`
- `matching-service` Cloud Run min instances: `0`
- `client` Cloud Run min instances: `0` (or `1` if needed)
- Keep `rtc-service` on VM for stable realtime media handling
