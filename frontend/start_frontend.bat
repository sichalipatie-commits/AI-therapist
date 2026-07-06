@echo off
echo ============================================
echo  MindEase Frontend — Next.js Dev Server
echo ============================================
echo.

cd /d "%~dp0"

REM Install deps if node_modules is missing
if not exist node_modules (
    echo Installing npm dependencies...
    npm install
)

echo.
echo Starting Next.js on http://localhost:3000 ...
echo.

npm run dev

pause
