# GCP deployment setup (GitHub -> GCP)

This folder contains production Docker and Cloud Build configs for all 4 services:

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
gcloud artifacts repositories create circlo \
  --repository-format=docker \
  --location=us-central1 \
  --description="Circlo service images"
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

Use the pushed image on a Compute Engine VM:

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
  us-central1-docker.pkg.dev/YOUR_PROJECT_ID/circlo/rtc-service:TAG
```

Open firewall rules for your mediasoup UDP/TCP ranges from `rtc-service` env config.

## 5) Connect GitHub to auto-deploy

Create 4 Cloud Build triggers (one per config file):

- `deploy/gcp/cloudbuild.client.yaml`
- `deploy/gcp/cloudbuild.server.yaml`
- `deploy/gcp/cloudbuild.matching.yaml`
- `deploy/gcp/cloudbuild.rtc.yaml`

Suggested trigger paths:

- `client/**`
- `server/**`
- `matching-service/**`
- `rtc-service/**`

Use branch `main` for production, and optionally a `staging` branch with separate services.

## 6) Recommended production defaults

- `server` Cloud Run min instances: `1`
- `matching-service` Cloud Run min instances: `0`
- `client` Cloud Run min instances: `0` (or `1` if needed)
- Keep `rtc-service` on VM for stable realtime media handling
