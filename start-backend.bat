@echo off
REM SchoologyCompass backend launcher - double-click this file.
REM Opens the API on http://127.0.0.1:8000 - keep this window open while using the app.
cd /d "%~dp0"
echo ============================================================
echo  SchoologyCompass backend
echo  Serving on http://127.0.0.1:8000
echo  Keep this window OPEN while using the app.
echo ============================================================
python -m uvicorn server:app --app-dir backend --port 8000
echo.
echo Backend stopped (or failed to start - see error above).
pause
