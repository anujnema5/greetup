# Greetup production deployment — status & next steps

Last updated: 2026-06-08  
Resume here when continuing production setup.

## Target architecture

| Service | Platform | Data / notes |
|---------|----------|----------------|
| client | Cloud Run (`asia-south1`) | `greetup.co` — `NEXT_PUBLIC_*` baked at build time |
| server | Cloud Run (`asia-south1`) | `api.greetup.co` |
| matching-service | Cloud Run (`asia-south1`, private) | Upstash Redis |
| rtc-service | GCE VM (`asia-south1-a`) | WebRTC UDP — Upstash Redis |
| Postgres | **Neon** (Tokyo `asia-northeast1` — Mumbai not in list) | `DATABASE_URL` |
| Redis | **Upstash** (Tokyo) | `REDIS_URL` |

**CI/CD goal:** GitHub `main` → Cloud Build triggers (deploy) + GitHub Actions (lint/test on PR before merge).

---

## GCP project

| Item | Value |
|------|-------|
| Project name | greetup-production |
| Project ID | `greetup-production-498717` |
| Project number | `923071310461` |
| Region | `asia-south1` (Mumbai) |
| Domain | `greetup.co`, `api.greetup.co`, `rtc.greetup.co` |
| Artifact Registry | `greetup` @ `asia-south1` |
| Deploy branch | `main` |
| GitHub repo | `greetup/greetup` (org) |

---

## Completed

- [x] GCP project created (`greetup-production-498717`)
- [x] APIs enabled, Artifact Registry `greetup` in `asia-south1`
- [x] Production deploy configs cleaned up (`deploy/gcp/cloudbuild.*.yaml` — no dev duplicates)
- [x] VM `greetup-vm` in `asia-south1-a`
- [x] Firewall: TCP `5370`, UDP `40000-49999` (RTC only — no Postgres/Redis on VM)
- [x] VM Docker + `~/greetup/docker-compose.yml` + `.env` (rtc-only, Upstash `REDIS_URL`)
- [x] RTC image built manually via Cloud Shell (`gcloud builds submit`)
- [x] RTC container **running** on VM (`docker-compose up`)
- [x] GitHub repo connected to Cloud Build (`greetup/greetup`)
- [x] Cloud Build trigger **`greetup-server`** created (`deploy/gcp/cloudbuild.server.yaml`, branch `^main$`)
- [x] `cloud-build-sa` IAM partially fixed (logs, artifact push working — server build steps 0–1 pass)
- [x] Cloud Run service **`server`** exists (created by trigger; revisions fail without env)
- [x] `$BUILD_ID` fix in local repo cloudbuild YAMLs (push to GitHub when ready)

### VM details

| Item | Value |
|------|-------|
| Name | `greetup-vm` |
| Zone | `asia-south1-a` |
| External IP | `34.100.160.205` |
| App dir | `~/greetup` |
| RTC image | `asia-south1-docker.pkg.dev/greetup-production-498717/greetup/rtc-service:latest` |

---

## In progress / blocked

### 1. Server Cloud Run — env not set (main blocker)

Trigger builds and pushes image successfully, but **Step 2 (deploy) fails** because the container crashes before listening on port 5300.

**Cause:** Server requires many env vars at startup (`server/src/shared/config/config.ts`). None configured on Cloud Run yet.

**Do not re-run trigger until env is set.** Set env in Console first, then Deploy.

#### Required Cloud Run env / secrets (server)

| Variable | Source |
|----------|--------|
| `DATABASE_URL` | Neon |
| `REDIS_URL` | Upstash |
| `BETTER_AUTH_URL` | `https://api.greetup.co` |
| `BETTER_AUTH_SECRET` | Secret Manager (random 32+ chars) |
| `WEB_CLIENT_HOST` | `https://greetup.co` |
| `SERVER_URL` | `https://api.greetup.co` |
| `MAILJET_API_KEY` / `MAILJET_API_SECRET` | Mailjet |
| `MAIL_FROM_EMAIL` | Verified Mailjet sender |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth (prod) |
| `DEV_NOTIFICATION_EMAIL` | Team email |
| `INTERNAL_API_KEY` | Same as VM `~/greetup/.env` |
| `RTC_JWT_SECRET` | Same as VM `~/greetup/.env` |
| `GEMINI_API_KEY` | Google AI |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase SA JSON as **one line** |

#### Recommended extras

```
PORT=5300
NODE_ENV=production
AUTH_COOKIE_DOMAIN=greetup.co
RTC_SERVICE_URL=http://34.100.160.205:5370
MATCH_ENGINE_URL=<after matching-service is deployed>
```

**Steps tomorrow:**

1. Create secrets in **Secret Manager**
2. **Cloud Run → server → Edit → Variables & Secrets → Deploy**
3. Check **Logs** — no `Missing required environment variable` errors
4. Run **Neon migrations** if not done: `DATABASE_URL=... bun run db:migrate` (from `server/`)

### 2. Org policy — public Cloud Run access blocked

```bash
gcloud run services add-iam-policy-binding server \
  --member="allUsers" --role="roles/run.invoker"
```

**Fails:** org policy does not permit `allUsers`.

**Impact:** Public `api.greetup.co` / browser clients cannot call API until org admin allows public invoker OR you use HTTPS Load Balancer in front of Cloud Run.

**Ask org admin:** Allow `allUsers` as `roles/run.invoker` on Cloud Run in project `greetup-production-498717`, or exempt project from domain-restricted sharing.

**Workaround for testing:** Authenticated curl with identity token (see `deploy/gcp/README.md` or Cloud Run docs).

Trigger logs show `Setting IAM policy....warning` — same org policy; separate from container crash.

### 3. `cloud-build-sa` — verify all roles

Ensure these are granted (run in Cloud Shell if unsure):

- `roles/logging.logWriter`
- `roles/artifactregistry.writer`
- `roles/run.admin`
- `roles/storage.objectAdmin`
- `roles/iam.serviceAccountUser` on `923071310461-compute@developer.gserviceaccount.com`

---

## Not started yet

### Cloud Build triggers (3 remaining)

Create same pattern as `greetup-server` (region `asia-south1`, SA `cloud-build-sa`, branch `^main$`):

| Trigger | Config | Included files |
|---------|--------|----------------|
| `greetup-matching-service` | `deploy/gcp/cloudbuild.matching.yaml` | `matching-service/**` |
| `greetup-client` | `deploy/gcp/cloudbuild.client.yaml` | `client/**` |
| `greetup-rtc-service` | `deploy/gcp/cloudbuild.rtc.yaml` | `rtc-service/**` |

**Client trigger:** add substitution variables `_NEXT_PUBLIC_*` (see `deploy/gcp/README.md`). Firebase keys required or build fails.

**RTC trigger:** after deploy, VM still needs manual `docker-compose pull && up -d` until VM automation is enabled (deferred).

### matching-service env (after deploy)

```
MATCH_WEBHOOK_URL=https://api.greetup.co/api/match/webhook
REDIS_URL, INTERNAL_API_KEY
```

Grant server → matching invoker:

```bash
gcloud run services add-iam-policy-binding matching-service \
  --region=asia-south1 \
  --member="serviceAccount:923071310461-compute@developer.gserviceaccount.com" \
  --role="roles/run.invoker"
```

### DNS

| Host | Target |
|------|--------|
| `greetup.co` | Cloud Run `client` |
| `api.greetup.co` | Cloud Run `server` |
| `rtc.greetup.co` | A record → `34.100.160.205` |

### Automation (planned)

- [ ] Push local cloudbuild `$BUILD_ID` fix + deploy doc updates to GitHub `main`
- [ ] VM auto-deploy on rtc trigger (`deploy/gcp/vm/deploy.sh` — deferred)
- [ ] GitHub Actions CI on PR: lint, typecheck, test (`client`, `server`, `matching-service`, `rtc`)
- [ ] GitHub branch protection: require CI pass before merge to `main`

---

## Recommended order for next session

```
1. Secret Manager — create all server secrets
2. Cloud Run server — attach secrets + env → Deploy → verify logs
3. Neon — run db:migrate
4. Org admin — public invoker for Cloud Run (or plan Load Balancer)
5. Create + run matching-service trigger → set env
6. Create client trigger (Firebase subs) → run
7. Create rtc trigger → VM docker-compose pull && up -d
8. DNS for greetup.co
9. Remaining triggers + GitHub Actions CI
```

---

## Useful commands

```bash
# Project
gcloud config set project greetup-production-498717

# Manual build (if needed)
cd greetup && gcloud builds submit --config deploy/gcp/cloudbuild.server.yaml .

# VM (SSH greetup-vm)
cd ~/greetup && docker-compose --env-file .env pull && docker-compose --env-file .env up -d

# List images
gcloud artifacts docker images list asia-south1-docker.pkg.dev/greetup-production-498717/greetup/server
```

---

## Related docs

- `deploy/gcp/README.md` — full production setup guide
- `docs/operations/deployment.md` — architecture overview
- `deploy/gcp/vm/.env.example` — VM env template
