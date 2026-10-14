@echo off
echo =========================================================
echo  Blue Carbon MRV - Frontend (Vite + React)
echo =========================================================
cd /d "%~dp0frontend"
echo Starting Vite dev server on http://localhost:5173 ...
echo Press Ctrl+C to stop.
echo.
npm.cmd run dev -- --host 0.0.0.0 --port 5173
pause
