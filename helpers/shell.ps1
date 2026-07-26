# =============================================================================
# helpers/shell.ps1 — local PowerShell scrapbook
# Copy a block into a terminal from the repo root. Uncomment as needed.
# Ports: client 3000 | server 5300 | matching 4020 | rtc 5370
#        postgres 25432 | redis 26379
#
# Production scrapbooks: helpers/prod/ (postgres.sql, redis.cli, api.http,
# droplet.sh, doctl.ps1, ssh.ps1) — see deploy/do/README.md
# Open rtc droplet:  powershell -ExecutionPolicy Bypass -File helpers/prod/ssh.ps1
# =============================================================================

# ── Docker (docker-compose.dev.yml) ───────────────────────────────────────────

# docker compose -f docker-compose.dev.yml up -d
# docker compose -f docker-compose.dev.yml ps
# docker compose -f docker-compose.dev.yml logs -f postgres redis
# docker compose -f docker-compose.dev.yml restart postgres redis
# docker compose -f docker-compose.dev.yml down
# # wipe volumes (DESTROYS local DB + Redis data):
# # docker compose -f docker-compose.dev.yml down -v

# ── Free stuck dev ports ──────────────────────────────────────────────────────

# bun run kill:ports
# # or:
# # bun scripts/kill-dev-ports.js

# ── Postgres (PostGIS container) ──────────────────────────────────────────────

# docker exec -it greetup_postgres psql -U postgres -d greetup_db
# docker exec -it greetup_postgres psql -U postgres -d greetup_db -c "\dt"
# docker exec -it greetup_postgres psql -U postgres -d greetup_db -c "SELECT count(*) FROM users;"

# # Run a snippet from helpers/postgres.sql (paste a SELECT into -c, or):
# # Get-Content helpers/postgres.sql | docker exec -i greetup_postgres psql -U postgres -d greetup_db

# # Host connection string shape (matches apps/server/env/.env.development):
# # postgresql://postgres:postgres@localhost:25432/greetup_db

# ── Redis ─────────────────────────────────────────────────────────────────────

# docker exec -it greetup_redis redis-cli
# docker exec -it greetup_redis redis-cli PING
# docker exec -it greetup_redis redis-cli DBSIZE
# docker exec -it greetup_redis redis-cli SMEMBERS all_online_users
# docker exec -it greetup_redis redis-cli SMEMBERS otc:online
# docker exec -it greetup_redis redis-cli SMEMBERS match:idx:online
# # nuclear local only:
# # docker exec -it greetup_redis redis-cli FLUSHDB

# ── Server DB scripts (from apps/server) ──────────────────────────────────────

# Push-Location apps/server
# bun run db:migrate
# bun run db:seed
# bun run db:seed:dev-users
# bun run db:studio
# # bun run db:clean --yes
# bun scripts/delete-user-by-email.ts user@example.com
# Pop-Location

# ── Smoke-check services are up ───────────────────────────────────────────────

# @(3000, 5300, 4020, 5370, 25432, 26379) | ForEach-Object {
#   $p = $_
#   try {
#     $c = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction Stop
#     "LISTEN  $p  PID=$($c.OwningProcess | Select-Object -First 1)"
#   } catch {
#     "CLOSED  $p"
#   }
# }

# curl.exe -s http://localhost:5300/
# curl.exe -s -o NUL -w "client %{http_code}`n" http://localhost:3000/
# curl.exe -s -o NUL -w "server %{http_code}`n" http://localhost:5300/

# ── Quick user lookup via docker psql ─────────────────────────────────────────

# $email = 'YOUR_EMAIL@example.com'
# docker exec -it greetup_postgres psql -U postgres -d greetup_db -c @"
# SELECT u.id, u.email, u.username, up.is_guest, up.is_onboarded, up.guest_trial_consumed_at
# FROM users u
# LEFT JOIN user_profiles up ON up.user_id = u.id
# WHERE u.email = '$email';
# "@

# ── Clear stuck OTC pause for a user (SQL) ────────────────────────────────────

# $email = 'YOUR_EMAIL@example.com'
# docker exec -it greetup_postgres psql -U postgres -d greetup_db -c @"
# UPDATE current_status cs
# SET open_to_connect_paused_for_room = false, updated_at = now()
# FROM user_profiles up
# JOIN users u ON u.id = up.user_id
# WHERE cs.profile_id = up.id AND u.email = '$email';
# "@

# ── Dev seed credentials reminder ─────────────────────────────────────────────

# # After bun run db:seed:dev-users — emails seed01@greetup.local … seed12@greetup.local
# # Password: GreetupSeed2026!
