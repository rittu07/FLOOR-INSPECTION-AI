# Runs the backend on this PC (GPU/PyTorch) and exposes it publicly through ngrok (run from the repo root):
#   powershell -ExecutionPolicy Bypass -File start-public.ps1
# One-time ngrok setup: sign up at https://dashboard.ngrok.com, then
#   ngrok config add-authtoken <your-token>
# Optional: set NGROK_DOMAIN (e.g. "your-name.ngrok-free.app") to pin the free dev domain.

$root = $PSScriptRoot
$backend = Join-Path $root 'backend'
$venvPython = Join-Path $backend '.venv\Scripts\python.exe'

if (-not (Test-Path $venvPython)) {
    throw 'backend/.venv not found. Run setup first:  powershell -ExecutionPolicy Bypass -File setup.ps1'
}
$ngrok = (Get-Command ngrok -ErrorAction SilentlyContinue).Source
if (-not $ngrok) { throw 'ngrok not found. Install it with:  winget install --id Ngrok.Ngrok -e' }

# 1. Backend on localhost:8000 (skip if already running)
$listening = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if (-not $listening) {
    Start-Process powershell -WorkingDirectory $backend -ArgumentList @(
        '-NoExit', '-Command', "& '$venvPython' -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
    )
    Write-Host 'Starting backend on http://localhost:8000 ...'
    for ($i = 0; $i -lt 60; $i++) {
        try { Invoke-RestMethod http://127.0.0.1:8000/health -TimeoutSec 2 | Out-Null; break } catch { Start-Sleep 1 }
    }
}

# 2. ngrok tunnel in its own window
$ngrokArgs = @('http', '8000')
if ($env:NGROK_DOMAIN) { $ngrokArgs += "--domain=$($env:NGROK_DOMAIN)" }
Start-Process $ngrok -ArgumentList $ngrokArgs

# 3. Read the public URL from ngrok's local API
$publicUrl = $null
for ($i = 0; $i -lt 30 -and -not $publicUrl; $i++) {
    Start-Sleep 1
    try {
        $tunnels = (Invoke-RestMethod http://127.0.0.1:4040/api/tunnels -TimeoutSec 2).tunnels
        $publicUrl = ($tunnels | Where-Object { $_.public_url -like 'https://*' } | Select-Object -First 1).public_url
    } catch { }
}

if ($publicUrl) {
    Write-Host "`nBackend is public at: $publicUrl" -ForegroundColor Green
    Write-Host "Health check:         $publicUrl/health"
    Write-Host "Live app:             https://floor-inspection-ai.vercel.app"
    Write-Host "If the app shows 'Not Connected', paste the URL above into Settings > Backend API Host URL."
    Write-Host "Keep this PC, the backend window and the ngrok window running while others use the app."
} else {
    Write-Host 'Could not read the ngrok URL. Check the ngrok window (is the authtoken configured?).' -ForegroundColor Yellow
}
