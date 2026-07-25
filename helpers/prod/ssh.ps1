# =============================================================================
# helpers/prod/ssh.ps1 — open greetup-rtc droplet over SSH from your laptop
#
# Usage (from repo root):
#   powershell -ExecutionPolicy Bypass -File helpers/prod/ssh.ps1
#   powershell -ExecutionPolicy Bypass -File helpers/prod/ssh.ps1 -TunnelRedis
#   powershell -ExecutionPolicy Bypass -File helpers/prod/ssh.ps1 -Remote "cd ~/greetup && docker compose ps"
#   powershell -ExecutionPolicy Bypass -File helpers/prod/ssh.ps1 -Ip 168.144.116.195
#
# Env overrides (optional):
#   $env:GREETUP_DROPLET_IP   = "168.144.116.195"
#   $env:GREETUP_SSH_KEY      = "$env:USERPROFILE\.ssh\greetup_do"
#
# Firewall: SSH (22) is home-IP only. If it hangs, check your public IP vs DO firewall.
# Optional ~/.ssh/config Host block is printed with -PrintConfig.
# =============================================================================

[CmdletBinding()]
param(
    [string] $Ip = $(if ($env:GREETUP_DROPLET_IP) { $env:GREETUP_DROPLET_IP } else { "168.144.116.195" }),
    [string] $Key = $(if ($env:GREETUP_SSH_KEY) { $env:GREETUP_SSH_KEY } else { Join-Path $env:USERPROFILE ".ssh\greetup_do" }),
    [string] $User = "root",
    # Local Redis Insight / redis-cli via tunnel → 127.0.0.1:16379 (needs REDIS_PASSWORD)
    [switch] $TunnelRedis,
    [int] $LocalRedisPort = 16379,
    # Run one remote command then exit (interactive shell if omitted)
    [string] $Remote = "",
    # Print a ready-to-paste ~/.ssh/config Host entry and exit
    [switch] $PrintConfig
)

$ErrorActionPreference = "Stop"

if ($PrintConfig) {
    @"
# Add to $env:USERPROFILE\.ssh\config then:  ssh greetup-rtc
Host greetup-rtc
  HostName $Ip
  User $User
  IdentityFile $Key
  IdentitiesOnly yes
  ServerAliveInterval 30
  ServerAliveCountMax 3

# Redis Insight tunnel (separate terminal):
#   ssh -N greetup-rtc-redis
Host greetup-rtc-redis
  HostName $Ip
  User $User
  IdentityFile $Key
  IdentitiesOnly yes
  LocalForward $LocalRedisPort 127.0.0.1:6379
"@
    exit 0
}

if (-not (Test-Path -LiteralPath $Key)) {
    Write-Error "SSH key not found: $Key`nCreate with: ssh-keygen -t ed25519 -C greetup -f `"$Key`""
}

$sshArgs = @(
    "-i", $Key,
    "-o", "IdentitiesOnly=yes",
    "-o", "ServerAliveInterval=30",
    "-o", "ServerAliveCountMax=3"
)

if ($TunnelRedis) {
    Write-Host "Tunneling Redis → 127.0.0.1:$LocalRedisPort (Ctrl+C to stop)" -ForegroundColor Cyan
    Write-Host "Redis Insight / redis-cli: 127.0.0.1:$LocalRedisPort  (auth = droplet REDIS_PASSWORD)" -ForegroundColor DarkGray
    $sshArgs += @("-N", "-L", "${LocalRedisPort}:127.0.0.1:6379")
}

$target = "${User}@${Ip}"
Write-Host "Connecting $target …" -ForegroundColor Green

if ($Remote -and -not $TunnelRedis) {
    & ssh @sshArgs $target $Remote
    exit $LASTEXITCODE
}

& ssh @sshArgs $target
exit $LASTEXITCODE
