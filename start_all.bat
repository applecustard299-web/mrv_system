@echo off
echo =========================================================
echo  Blue Carbon Registry ^& MRV System - Launcher
echo =========================================================
echo.

:: Kill anything already using port 8000 or 5173
echo Freeing ports 8000 and 5173...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":8000 " ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":5173 " ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
timeout /t 1 /nobreak >nul

echo Starting Backend  (FastAPI on port 8000)...
start "Blue Carbon Backend" cmd /k "cd /d "%~dp0backend" && python run.py"

echo Waiting for backend to initialize...
timeout /t 4 /nobreak >nul

echo Starting Frontend (Vite on port 5173)...
start "Blue Carbon Frontend" cmd /k "cd /d "%~dp0frontend" && npm.cmd run dev -- --host 0.0.0.0 --port 5173"

echo.
echo =========================================================
echo  Done! Open your browser to:
echo    App:      http://localhost:5173
echo    API Docs: http://127.0.0.1:8000/docs
echo =========================================================
echo.
pause
