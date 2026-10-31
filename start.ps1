# ============================================================
# Air Quality Analytics DA-013 — Startup Script (PowerShell)
# ============================================================
# Starts the Flask backend which also serves the frontend.
# Open http://127.0.0.1:5000 in your browser after running.

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PythonExe = Join-Path $ScriptDir "backend\.venv\Scripts\python.exe"
$AppScript  = Join-Path $ScriptDir "backend\app.py"

if (-not (Test-Path $PythonExe)) {
    Write-Host "ERROR: Virtual environment not found at backend\.venv" -ForegroundColor Red
    Write-Host "Run:  pip install -r backend\requirements.txt  to set up dependencies." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Air Quality Analytics DA-013" -ForegroundColor Cyan
Write-Host "  Starting Flask server..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Backend API  : http://127.0.0.1:5000/api" -ForegroundColor Green
Write-Host "  Frontend UI  : http://127.0.0.1:5000" -ForegroundColor Green
Write-Host ""
Write-Host "  Open http://127.0.0.1:5000 in your browser." -ForegroundColor Yellow
Write-Host "  Press Ctrl+C to stop the server." -ForegroundColor Yellow
Write-Host ""

Set-Location $ScriptDir
& $PythonExe $AppScript

