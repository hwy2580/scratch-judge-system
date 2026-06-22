@echo off
REM Start judge server and main service

echo Starting Scratch Judge System...

REM Start judge server (port 3001)
echo Starting judge server (port 3001)...
cd /d "%~dp0scratch-judge-server"
start "Scratch Judge" cmd /c "node server.js"

REM Wait for judge server to start
timeout /t 3 /nobreak >nul

REM Start main service (port 3000)
echo Starting main service (port 3000)...
cd /d "%~dp0scratch-oj-server"
start "Scratch OJ" cmd /c "node server.js"

echo.
echo Done!
echo Judge server: http://localhost:3001
echo Main service: http://localhost:3000
echo.
echo Use stop.bat to stop services
pause
