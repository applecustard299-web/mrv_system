@echo off
echo =========================================================
echo  Blue Carbon MRV - Backend (FastAPI + SQLite)
echo =========================================================
cd /d "%~dp0backend"
echo Starting server on http://127.0.0.1:8000 ...
echo Press Ctrl+C to stop.
echo.
python run.py
pause
