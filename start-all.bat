@echo off
REM SchoologyCompass - starts everything. Double-click this file.
REM Opens TWO windows (backend + frontend). Keep BOTH open while using the app.
cd /d "%~dp0"
start "SchoologyCompass backend" cmd /k "python -m uvicorn server:app --app-dir backend --port 8000"
start "SchoologyCompass frontend" cmd /k "npm.cmd run preview"
echo ============================================================
echo  Two windows were opened (backend + frontend).
echo  Keep BOTH open. Then open in your browser:
echo.
echo    http://localhost:5180/
echo ============================================================
pause
