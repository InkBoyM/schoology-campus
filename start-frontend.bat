@echo off
REM SchoologyCompass frontend launcher - double-click this file.
REM Serves the production build (stable, low memory). Start the backend FIRST (start-backend.bat).
cd /d "%~dp0"
echo ============================================================
echo  SchoologyCompass frontend (production server)
echo  Open http://localhost:5180/ in your browser.
echo  Make sure start-backend.bat is running first!
echo  Keep this window OPEN while using the app.
echo ============================================================
if not exist ".svelte-kit\output\client" (
  echo First run: building the app, this takes ~2 minutes...
  call npm.cmd run build
)
call npm.cmd run preview
pause
