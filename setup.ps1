# One-time setup for a new Windows machine (run from the repo root):
#   powershell -ExecutionPolicy Bypass -File setup.ps1
# Installs frontend packages, creates backend/.venv with PyTorch (CUDA if an NVIDIA GPU is present,
# otherwise CPU), installs backend requirements and creates backend/.env.

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$backend = Join-Path $root 'backend'
$venvPython = Join-Path $backend '.venv\Scripts\python.exe'

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }

Step 'Checking tools'
foreach ($tool in 'node', 'npm', 'python') {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        throw "$tool not found. Install Node.js 20+ (https://nodejs.org) and Python 3.11 (https://python.org, tick 'Add to PATH')."
    }
}
$pyVersion = (& python -c "import sys; print('%d.%d' % sys.version_info[:2])").Trim()
if ([version]$pyVersion -lt [version]'3.10') { throw "Python 3.10+ required, found $pyVersion" }
Write-Host "node $(node --version), python $pyVersion"

Step 'Installing frontend packages (npm install)'
Push-Location $root
npm install
if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }
Pop-Location

Step 'Creating Python virtual environment (backend/.venv)'
if (-not (Test-Path $venvPython)) {
    & python -m venv (Join-Path $backend '.venv')
}
& $venvPython -m pip install --upgrade pip --quiet

$hasNvidia = [bool](Get-Command nvidia-smi -ErrorAction SilentlyContinue)
if ($hasNvidia) {
    Step 'NVIDIA GPU detected: installing CUDA build of PyTorch'
    & $venvPython -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu130
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'CUDA build failed (driver may be too old); falling back to CPU build' -ForegroundColor Yellow
        $hasNvidia = $false
    }
}
if (-not $hasNvidia) {
    Step 'Installing CPU build of PyTorch'
    & $venvPython -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
    if ($LASTEXITCODE -ne 0) { throw 'PyTorch install failed' }
}

Step 'Installing backend requirements'
& $venvPython -m pip install -r (Join-Path $backend 'requirements.txt')
if ($LASTEXITCODE -ne 0) { throw 'pip install -r requirements.txt failed' }

Step 'Creating backend/.env'
$envFile = Join-Path $backend '.env'
if (-not (Test-Path $envFile)) {
    Copy-Item (Join-Path $backend '.env.example') $envFile
    Write-Host 'Created backend/.env from .env.example'
} else {
    Write-Host 'backend/.env already exists (kept)'
}

Step 'Checking trained model'
$model = Join-Path $backend 'ml\crack_detection\models\best.pt'
if (Test-Path $model) {
    Write-Host "Model found: $model"
} else {
    Write-Host 'Model missing: run "git pull" (backend/ml/crack_detection/models/best.pt is versioned).' -ForegroundColor Yellow
}

& $venvPython -c "import torch; print('PyTorch', torch.__version__, '| CUDA available:', torch.cuda.is_available())"

Write-Host "`nSetup complete. Start the app with:  powershell -ExecutionPolicy Bypass -File start.ps1" -ForegroundColor Green
