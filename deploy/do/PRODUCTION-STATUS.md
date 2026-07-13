# Greetup production deployment on DigitalOcean — status

Last updated: 2026-07-02  
Resume here when continuing DO production setup.

## Target architecture (hybrid)

| Service | Platform | Data / notes |
|---------|----------|----------------|
| client | App Platform (BLR1) | `greetup.co` — `NEXT_PUBLIC_*` baked at build time |
| server | App Platform (BLR1) | `api.greetup.co` |
| matching-service | App Platform (BLR1) | Redis on rtc droplet |
| rtc-service | Droplet `greetup-rtc` (BLR1) | WebRTC UDP + Redis |
| Postgres | **Managed PostgreSQL** (BLR1) | `greetup_db` + PostGIS |
| Redis | **Self-hosted** on rtc droplet | `REDIS_URL` via VPC private IP |
| Object storage | **Spaces** ($5/mo) | Profile photos, uploads |
| Registry | **Container Registry** Basic | `registry.digitalocean.com/greetup` |

**Estimated monthly cost:** ~$76–78/mo (see `deploy/do/README.md`).

---

## Completed

- [x] Container Registry `greetup` — Basic ($5/mo)
- [x] `doctl` / `docker login registry.digitalocean.com` on laptop
- [x] Images pushed: `server`, `matching-service`, `rtc-service`
- [x] Managed PostgreSQL `greetup-db` — PG 16, BLR1, 1 GiB (~$13–15/mo)
- [x] Database `greetup_db` created
- [x] PostGIS enabled + `bun run db:migrate` from laptop
- [x] Droplet `greetup-rtc` — 2 vCPU / 2 GiB ($24/mo), BLR1, Premium Intel
- [x] Firewall `greetup-rtc-fw` — SSH (home IP), TCP 5370, UDP 40000–49999
- [x] Docker + `~/greetup/.env` + `docker-compose.yml` on rtc droplet
- [x] `docker compose pull && up -d` — redis + rtc-service **running**
- [x] RTC logs: Redis connected, mediasoup worker, listening on `:5370`

---

## In progress / next

### 1. Firewall — Redis for App Platform

Add **inbound** on `greetup-rtc-fw`:

| Protocol | Port | Sources |
|----------|------|---------|
| TCP | 6379 | VPC CIDR only (e.g. `10.122.0.0/20`) |

Do **not** expose 6379 to `0.0.0.0/0`.

### 2. Postgres network access

`greetup-db` → **Network Access** → add VPC CIDR (if not done).

### 3. App Platform apps (order)

1. `matching-service` — 512 MiB, port `5060`, VPC enabled
2. `server` — 1 GiB, port `5300`, VPC enabled, all secrets
3. `client` — 1 GiB, port `3000`, image with `NEXT_PUBLIC_*` build args

### 4. Spaces

Create Space in BLR1, API keys → server `DO_SPACES_*` env vars.

### 5. Staging DNS

| Host | Target |
|------|--------|
| `staging.greetup.co` | App Platform client |
| `api-staging.greetup.co` | App Platform server |
| `rtc-staging.greetup.co` | A → rtc droplet public IP |

### 6. GitHub Actions CI/CD

Replace GCP Cloud Build triggers (not started).

### 7. Production DNS cutover

Only after staging tests pass. Keep GCP running as rollback until stable.

---

## Key connection values (fill in)

| Item | Value |
|------|-------|
| Registry | `registry.digitalocean.com/greetup` |
| PG database | `greetup_db` |
| PG private host | `private-greetup-db-...db.ondigitalocean.com:25060` |
| Rtc droplet public IP | `<VM_PUBLIC_IP>` |
| Rtc droplet private IP | `<VPC_PRIVATE_IP>` |
| `REDIS_URL` (App Platform) | `redis://:<REDIS_PASSWORD>@<VPC_PRIVATE_IP>:6379` |
| `RTC_SERVICE_URL` (server) | `http://<VPC_PRIVATE_IP>:5370` |

---

## Useful commands

```bash
# Laptop — build & push rtc image
docker build -f apps/rtc-service/Dockerfile -t registry.digitalocean.com/greetup/rtc-service:latest .

docker push registry.digitalocean.com/greetup/rtc-service:latest

# VM — SSH
ssh -i ~/.ssh/greetup_do root@<DROPLET_PUBLIC_IP>

# VM — redeploy rtc after new image
cd ~/greetup && docker compose --env-file .env pull && docker compose --env-file .env up -d
docker compose ps
docker compose logs rtc-service --tail 50

# Laptop — migrations (use public PG host + home IP in trusted sources)
cd server
DATABASE_URL="postgresql://doadmin:...@...:25060/greetup_db?sslmode=no-verify" bun run db:migrate
```

---

## Related docs

- `deploy/do/README.md` — full step-by-step setup guide
- `deploy/gcp/README.md` — legacy GCP reference (decommission after cutover)
- `docs/operations/deployment.md` — architecture overview (update after DO cutover)
