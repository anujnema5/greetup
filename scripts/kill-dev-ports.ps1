# Kills whatever is listening on the greetup dev ports.
# Usage:  pnpm/bun run kill:ports   OR   powershell -ExecutionPolicy Bypass -File scripts/kill-dev-ports.ps1
# Add more ports to the list as needed.

$ports = @(
    3000,  # client (next dev)
    3001,  # client (next dev fallback)
    5300,  # server
    4020,  # matching-service
    5370   # rtc-service
)

$killed = @()
foreach ($port in $ports) {
    try {
        $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop
    } catch { continue }

    foreach ($conn in $conns) {
        $procId = $conn.OwningProcess
        if ($killed -contains $procId) { continue }
        $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
        try {
            Stop-Process -Id $procId -Force -ErrorAction Stop
            $killed += $procId
            Write-Host ("Killed PID {0} ({1}) on port {2}" -f $procId, $proc.ProcessName, $port) -ForegroundColor Green
        } catch {
            Write-Host ("Could not kill PID {0} on port {1}: {2}" -f $procId, $port, $_.Exception.Message) -ForegroundColor Red
        }
    }
}

if ($killed.Count -eq 0) {
    Write-Host "No dev processes were listening on: $($ports -join ', ')" -ForegroundColor Yellow
} else {
    Write-Host ("Done. Freed {0} process(es)." -f $killed.Count) -ForegroundColor Cyan
}
