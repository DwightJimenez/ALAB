@echo off
TITLE Starting Application...

set "APP_URL=http://localhost:5173"
set "WAIT_SECONDS=3"

echo ==========================================
echo   Starting application and browser...
echo   Target: %APP_URL%
echo ==========================================
echo.

:: Automatically navigates to the project folder where this script lives
cd /d "%~dp0"

:: Opens the browser automatically after the designated wait time
start /min cmd /c "timeout /t %WAIT_SECONDS% /nobreak > nul && start %APP_URL%"

:: Runs your development script
npm run dev

pause