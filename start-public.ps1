# Floor Inspection AI launcher: runs the backend on this PC (GPU/PyTorch), exposes it through ngrok and opens
# the live app already connected to it. Double-click "Launch Floor Inspection AI.bat", or run from the repo root:
#   powershell -ExecutionPolicy Bypass -File start-public.ps1 [-Domain your-name.ngrok-free.app] [-InstallShortcut]
#
#   -Domain           pin your free ngrok dev domain (also read from $env:NGROK_DOMAIN)
#   -InstallShortcut  put a "Floor Inspection AI" shortcut on the Desktop and exit
#   -NoBrowser        don't open the app (still prints and copies the link)

param(
    [string]$Domain = $env:NGROK_DOMAIN,
    [switch]$InstallShortcut,
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$AppUrl = 'https://floor-inspection-ai.vercel.app'
$root = $PSScriptRoot
$backend = Join-Path $root 'backend'
$venvPython = Join-Path $backend '.venv\Scripts\python.exe'
$launcherBat = Join-Path $root 'Launch Floor Inspection AI.bat'

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Fail($msg) { Write-Host "`n$msg" -ForegroundColor Red; Read-Host 'Press Enter to close'; exit 1 }

if ($InstallShortcut) {
    $shell = New-Object -ComObject WScript.Shell
    $lnk = $shell.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Desktop')) 'Floor Inspection AI.lnk'))
    $lnk.TargetPath = $launcherBat
    $lnk.WorkingDirectory = $root
    $lnk.IconLocation = "$env:SystemRoot\System32\shell32.dll,13"
    $lnk.Description = 'Start the Floor Inspection AI backend + ngrok and open the app'
    $lnk.Save()
    Write-Host 'Desktop shortcut "Floor Inspection AI" created.' -ForegroundColor Green
    exit 0
}

Write-Host 'FLOOR INSPECTION AI - public launcher' -ForegroundColor Green

# --- Prerequisites --------------------------------------------------------------------------------------
if (-not (Test-Path $venvPython)) {
    Fail 'backend/.venv not found. Run setup first:  powershell -ExecutionPolicy Bypass -File setup.ps1'
}
$ngrok = (Get-Command ngrok -ErrorAction SilentlyContinue).Source
if (-not $ngrok) {
    Step 'Installing ngrok (winget)'
    winget install --id Ngrok.Ngrok -e --accept-source-agreements --accept-package-agreements
    $ngrok = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Links\ngrok.exe'
    if (-not (Test-Path $ngrok)) { Fail 'ngrok install failed. Install it from https://ngrok.com/download and re-run.' }
}

# First run: the ngrok account token is entered here by you and stored only in ngrok's local config.
& $ngrok config check *> $null
if ($LASTEXITCODE -ne 0) {
    Step 'One-time ngrok setup'
    Write-Host 'Opening your ngrok token page (sign up free if needed)...'
    Start-Process 'https://dashboard.ngrok.com/get-started/your-authtoken'
    $token = Read-Host 'Paste your ngrok authtoken here'
    if (-not $token.Trim()) { Fail 'No token entered.' }
    & $ngrok config add-authtoken $token.Trim()
    if ($LASTEXITCODE -ne 0) { Fail 'Saving the ngrok token failed.' }
}

# --- Backend ----------------------------------------------------------------------------------------------
$started = @()
$startedBackend = $false
Step 'Starting backend on http://localhost:8000'
if (Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue) {
    Write-Host 'Backend already running - reusing it.'
} else {
    $startedBackend = $true
    $started += Start-Process powershell -PassThru -WindowStyle Minimized -WorkingDirectory $backend -ArgumentList @(
        '-NoExit', '-Command', "`$host.UI.RawUI.WindowTitle='Floor Inspection backend'; & '$venvPython' -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
    )
}
$ok = $false
for ($i = 0; $i -lt 90 -and -not $ok; $i++) {
    try { Invoke-RestMethod http://127.0.0.1:8000/health -TimeoutSec 2 | Out-Null; $ok = $true } catch { Start-Sleep 1 }
}
if (-not $ok) { Fail 'Backend did not start. Check the "Floor Inspection backend" window for errors.' }
Write-Host 'Backend is up.'

# --- ngrok tunnel -----------------------------------------------------------------------------------------
function Get-TunnelUrl {
    try {
        $t = (Invoke-RestMethod http://127.0.0.1:4040/api/tunnels -TimeoutSec 2).tunnels |
            Where-Object { $_.public_url -like 'https://*' -and $_.config.addr -match ':8000$' } | Select-Object -First 1
        return $t.public_url
    } catch { return $null }
}

Step 'Opening ngrok tunnel'
$publicUrl = Get-TunnelUrl
if ($publicUrl) {
    Write-Host 'ngrok tunnel already running - reusing it.'
} else {
    $ngrokArgs = @('http', '8000')
    if ($Domain) { $ngrokArgs += "--url=https://$($Domain -replace '^https?://', '')" }
    $started += Start-Process $ngrok -PassThru -WindowStyle Minimized -ArgumentList $ngrokArgs
    for ($i = 0; $i -lt 30 -and -not $publicUrl; $i++) { Start-Sleep 1; $publicUrl = Get-TunnelUrl }
}
if (-not $publicUrl) { Fail 'Could not open the ngrok tunnel. Restore the minimized ngrok window to see why.' }

try {
    $health = Invoke-RestMethod "$publicUrl/health" -Headers @{ 'ngrok-skip-browser-warning' = 'true' } -TimeoutSec 15
    if ($health.status -ne 'ok') { throw 'unexpected response' }
} catch {
    Fail "Tunnel opened at $publicUrl but the backend is not reachable through it: $_"
}

# --- Open the app ---------------------------------------------------------------------------------------
$shareLink = "$($AppUrl)/?backend=$([uri]::EscapeDataString($publicUrl))"
try { Set-Clipboard -Value $shareLink } catch { }

Write-Host "`n========================================================================" -ForegroundColor Green
Write-Host " Backend (public):  $publicUrl"
Write-Host " App link:          $shareLink"
Write-Host '                    (copied to clipboard - send it to anyone / open on any device)'
Write-Host '========================================================================' -ForegroundColor Green
if (-not $NoBrowser) { Start-Process $shareLink }

Write-Host "`nKeep this window open while the app is in use."
Read-Host 'Press Enter to stop the backend and ngrok'

foreach ($p in $started) {
    if ($p -and -not $p.HasExited) { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue }
}
# uvicorn runs as a child of the backend window's PowerShell; stop whatever still listens on 8000
$listener = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener -and $startedBackend) { Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue }
Write-Host 'Stopped.'
