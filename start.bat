@echo off
REM ============================================================
REM  Air Quality Analytics DA-013 — Startup Script (CMD)
REM ============================================================
REM  Starts the Flask backend which also serves the frontend.
REM  Open http://127.0.0.1:5000 in your browser after running.

cd /d "%~dp0"

IF NOT EXIST "backend\.venv\Scripts\python.exe" (
    echo ERROR: Virtual environment not found at backend\.venv
    echo Run:  pip install -r backend\requirements.txt
    pause
    exit /b 1
)

echo.
echo ==========================================
echo   Air Quality Analytics DA-013
echo   Starting Flask server...
echo ==========================================
echo.
echo   Backend API  : http://127.0.0.1:5000/api
echo   Frontend UI  : http://127.0.0.1:5000
echo.
echo   Open http://127.0.0.1:5000 in your browser.
echo   Press Ctrl+C to stop the server.
echo.

backend\.venv\Scripts\python.exe backend\app.py
pause

