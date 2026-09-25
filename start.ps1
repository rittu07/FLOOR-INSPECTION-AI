# Starts the backend (port 8000) and frontend (port 3000) in separate windows (run from the repo root):
#   powershell -ExecutionPolicy Bypass -File start.ps1

$root = $PSScriptRoot
$backend = Join-Path $root 'backend'
$venvPython = Join-Path $backend '.venv\Scripts\python.exe'

if (-not (Test-Path $venvPython)) {
    throw 'backend/.venv not found. Run setup first:  powershell -ExecutionPolicy Bypass -File setup.ps1'
}

Start-Process powershell -WorkingDirectory $backend -ArgumentList @(
    '-NoExit', '-Command', "& '$venvPython' -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
)
Start-Process powershell -WorkingDirectory $root -ArgumentList @('-NoExit', '-Command', 'npm run dev')

Write-Host 'Backend:  http://localhost:8000/docs'
Write-Host 'Frontend: http://localhost:3000  (opening in a few seconds...)'
Start-Sleep -Seconds 6
Start-Process 'http://localhost:3000'
