@echo off
title Blue Carbon MRV - Launcher
color 0A
echo.
echo  =====================================================
echo   Blue Carbon Registry ^& MRV System
echo  =====================================================
echo.

:: Kill anything on ports 8000 and 5173
echo  [1/4] Freeing ports 8000 and 5173...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

:: Start Backend
echo  [2/4] Starting Backend (FastAPI on port 8000)...
start "Blue Carbon - Backend" cmd /k "color 0B && title Backend - FastAPI && cd /d "%~dp0backend" && echo Backend starting... && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

:: Wait for backend to be ready
echo  [3/4] Waiting 5 seconds for backend to initialize...
timeout /t 5 /nobreak >nul

:: Start Frontend
echo  [4/4] Starting Frontend (Vite on port 5173)...
start "Blue Carbon - Frontend" cmd /k "color 0D && title Frontend - Vite && cd /d "%~dp0frontend" && echo Frontend starting... && npm.cmd run dev -- --host 0.0.0.0 --port 5173"

echo.
echo  =====================================================
echo   Both servers are starting in separate windows!
echo.
echo   Open your browser to:
echo     http://localhost:5173
echo.
echo   Keep BOTH terminal windows open while using the app.
echo   Close this window when done.
echo  =====================================================
echo.
timeout /t 3 /nobreak >nul

:: Open browser automatically
start "" "http://localhost:5173"

pause
