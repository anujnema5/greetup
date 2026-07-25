#!/usr/bin/env bash
# =============================================================================
# helpers/prod/droplet.sh — greetup-rtc droplet scrapbook (run ON the VM)
# Droplet: greetup-rtc | Compose dir: ~/greetup | Services: redis, rtc, caddy, watchtower
#
# Open this VM from your laptop first:
#   powershell -ExecutionPolicy Bypass -File helpers/prod/ssh.ps1
#   # or: ssh -i ~/.ssh/greetup_do root@168.144.116.195
#
# SAFETY: prefer logs/ps/pull. Avoid compose down -v. Never expose Redis publicly.
# =============================================================================

set -euo pipefail
cd "${HOME}/greetup"

# ── Status ────────────────────────────────────────────────────────────────────

# docker compose --env-file .env ps
# docker compose --env-file .env logs rtc-service --tail 80
# docker compose --env-file .env logs redis --tail 40
# docker compose --env-file .env logs caddy --tail 40
# docker compose --env-file .env logs watchtower --tail 40

# curl -s http://127.0.0.1:5370/health
# curl -sI https://rtc.greetup.co/health

# free -h
# df -h /
# ss -lntu | grep -E '5370|6379|80|443|40000' || true

# ── Secrets / env (do not paste into chats) ───────────────────────────────────

# set -a && source .env && set +a
# echo "VM_PUBLIC_IP=$VM_PUBLIC_IP"
# echo "RTC_IMAGE=$RTC_IMAGE"
# # echo "$REDIS_PASSWORD"   # careful

# ── Redis (password required) ─────────────────────────────────────────────────

# set -a && source .env && set +a
# REDIS_CID="$(docker compose --env-file .env ps -q redis)"
# docker exec -it "$REDIS_CID" redis-cli -a "$REDIS_PASSWORD" PING
# docker exec -it "$REDIS_CID" redis-cli -a "$REDIS_PASSWORD" INFO memory
# docker exec -it "$REDIS_CID" redis-cli -a "$REDIS_PASSWORD" DBSIZE
# docker exec -it "$REDIS_CID" redis-cli -a "$REDIS_PASSWORD" SCARD all_online_users
# docker exec -it "$REDIS_CID" redis-cli -a "$REDIS_PASSWORD" SCARD otc:online
# docker exec -it "$REDIS_CID" redis-cli -a "$REDIS_PASSWORD" SCARD match:idx:online

# ── Redeploy rtc image (Watchtower also polls :latest every 5m) ───────────────

# docker login registry.digitalocean.com
# docker compose --env-file .env pull rtc-service
# docker compose --env-file .env up -d rtc-service
# docker compose --env-file .env logs rtc-service --tail 50

# ── Restart without image change ──────────────────────────────────────────────

# docker compose --env-file .env restart rtc-service
# docker compose --env-file .env restart redis
# docker compose --env-file .env restart caddy

# ── Caddy / TLS ───────────────────────────────────────────────────────────────

# docker compose --env-file .env exec caddy caddy version
# ls -la /data/caddy/certificates 2>/dev/null || true
# # certs live in the caddy_data volume — inspect via:
# docker compose --env-file .env exec caddy ls /data/caddy/certificates || true

# ── Firewall reminder (do on DO console, not here) ────────────────────────────
# Inbound: 22 (home IP), 80/443 (all), 5370 (VPC), 6379 (VPC), UDP 40000-49999 (all)
# Do NOT open 6379 to 0.0.0.0/0

# ── Dangerous ─────────────────────────────────────────────────────────────────

# # docker compose --env-file .env down
# # docker compose --env-file .env down -v   # destroys caddy cert volume
# # docker volume prune -f
