# =============================================================================
# helpers/prod/doctl.ps1 — laptop-side DigitalOcean / registry helpers
# Region: BLR1 | Registry: registry.digitalocean.com/greetup
# Full runbook: deploy/do/README.md , deploy/do/GO-LIVE-STEPS.md
#
# One-time:
#   winget install DigitalOcean.Doctl
#   doctl auth init
#   doctl registry login
# =============================================================================

# ── Auth / account ────────────────────────────────────────────────────────────

# doctl auth list
# doctl account get
# doctl registry login

# # If doctl not on PATH (WinGet install):
# # $doctl = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\DigitalOcean.Doctl_Microsoft.Winget.Source_8wekyb3d8bbwe\doctl.exe"

# ── Registry images ───────────────────────────────────────────────────────────

# doctl registry repository list-v2
# doctl registry repository list-tags server
# doctl registry repository list-tags matching-service
# doctl registry repository list-tags rtc-service
# doctl registry repository list-tags client

# ── Build & push (from repo root) ─────────────────────────────────────────────

# docker build -f apps/server/Dockerfile -t registry.digitalocean.com/greetup/server:latest .
# docker push registry.digitalocean.com/greetup/server:latest

# docker build -f apps/matching-service/Dockerfile -t registry.digitalocean.com/greetup/matching-service:latest .
# docker push registry.digitalocean.com/greetup/matching-service:latest

# docker build -f apps/rtc-service/Dockerfile -t registry.digitalocean.com/greetup/rtc-service:latest .
# docker push registry.digitalocean.com/greetup/rtc-service:latest

# # Client — NEXT_PUBLIC_* baked at build time (prod example)
# docker build -f apps/client/Dockerfile `
#   --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.greetup.co/api `
#   --build-arg NEXT_PUBLIC_SOCKET_SERVER_URL=https://api.greetup.co `
#   --build-arg NEXT_PUBLIC_RTC_SOCKET_URL=https://rtc.greetup.co `
#   --build-arg NEXT_PUBLIC_APP_URL=https://greetup.co `
#   --build-arg NEXT_PUBLIC_FIREBASE_API_KEY=$env:NEXT_PUBLIC_FIREBASE_API_KEY `
#   --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$env:NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN `
#   --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID=$env:NEXT_PUBLIC_FIREBASE_PROJECT_ID `
#   --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$env:NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID `
#   --build-arg NEXT_PUBLIC_FIREBASE_APP_ID=$env:NEXT_PUBLIC_FIREBASE_APP_ID `
#   -t registry.digitalocean.com/greetup/client:latest .
# docker push registry.digitalocean.com/greetup/client:latest

# ── App Platform ──────────────────────────────────────────────────────────────

# doctl apps list
# doctl apps get <APP_ID>
# doctl apps list-deployments <APP_ID>
# doctl apps logs <APP_ID> --type run --follow
# doctl apps create-deployment <APP_ID>   # force redeploy latest image settings

# # GitHub Actions variables (IDs): DO_APP_ID_CLIENT / DO_APP_ID_SERVER / DO_APP_ID_MATCHING
# # doctl apps list --format ID,Spec.Name,DefaultIngress

# ── Droplet / DB (inventory) ──────────────────────────────────────────────────

# doctl compute droplet list
# doctl compute droplet get greetup-rtc
# doctl databases list
# doctl databases connection greetup-db --format Host,Port,User,SSL,Database

# ── SSH to rtc droplet (open VM from laptop) ──────────────────────────────────

# Interactive shell (preferred helper):
# powershell -ExecutionPolicy Bypass -File helpers/prod/ssh.ps1

# Or one-liner (IP from GO-LIVE; override if droplet was rebuilt):
# ssh -i $env:USERPROFILE\.ssh\greetup_do -o IdentitiesOnly=yes root@168.144.116.195

# Resolve current public IP via doctl, then SSH:
# $ip = (doctl compute droplet get greetup-rtc --format PublicIPv4 --no-header).Trim()
# ssh -i $env:USERPROFILE\.ssh\greetup_do -o IdentitiesOnly=yes root@$ip

# Redis Insight tunnel (keeps foreground open; connect to 127.0.0.1:16379):
# powershell -ExecutionPolicy Bypass -File helpers/prod/ssh.ps1 -TunnelRedis
# # or:
# # ssh -i $env:USERPROFILE\.ssh\greetup_do -N -L 16379:127.0.0.1:6379 root@168.144.116.195

# One-shot remote command:
# powershell -ExecutionPolicy Bypass -File helpers/prod/ssh.ps1 -Remote "cd ~/greetup && docker compose --env-file .env ps"

# Print ~/.ssh/config Host blocks (then: ssh greetup-rtc):
# powershell -ExecutionPolicy Bypass -File helpers/prod/ssh.ps1 -PrintConfig

# scp deploy files:
# $ip = '168.144.116.195'
# scp -i $env:USERPROFILE\.ssh\greetup_do deploy/do/vm/docker-compose.yml "root@${ip}:~/greetup/docker-compose.yml"
# scp -i $env:USERPROFILE\.ssh\greetup_do deploy/do/vm/Caddyfile "root@${ip}:~/greetup/Caddyfile"

# ── Managed Postgres migrate from laptop (trusted IP required) ────────────────
# # Migrations normally run on server container start — only use this for emergencies.
# # See deploy/do/server-migrations.md
#
# Push-Location apps/server
# $env:DATABASE_URL = 'postgresql://doadmin:PASSWORD@PUBLIC-HOST:25060/greetup_db?sslmode=no-verify'
# bun run db:migrate
# Pop-Location

# ── Prod smoke (after deploy) ─────────────────────────────────────────────────

# curl.exe -sI https://greetup.co/
# curl.exe -sI https://www.greetup.co/
# curl.exe -s  https://api.greetup.co/
# curl.exe -s  https://rtc.greetup.co/health
# curl.exe -sI https://staging.greetup.co/
# curl.exe -s  https://api-staging.greetup.co/
# curl.exe -s  https://rtc-staging.greetup.co/health

# ── Matching webhook reminder ─────────────────────────────────────────────────
# MATCH_WEBHOOK_URL must be https://api.greetup.co/internal
# (NOT .../api/match/webhook — that double-prefixes /webhook and 401s)
