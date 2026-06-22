@echo off
REM Stop judge server and main service

echo Stopping Scratch Judge System...

REM Stop judge server (port 3001)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
    echo Stopped judge server (PID: %%a)
)

REM Stop main service (port 3000)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
    echo Stopped main service (PID: %%a)
)

echo.
echo Done!
pause
