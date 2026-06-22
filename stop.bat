@echo off
REM 停止评测机和主服务

echo 🛑 停止 Scratch 判题系统...

REM 停止评测机 (端口 3001)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
    if !errorlevel! equ 0 (
        echo   已停止评测机 (PID: %%a)
    )
)

REM 停止主服务 (端口 3000)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
    if !errorlevel! equ 0 (
        echo   已停止主服务 (PID: %%a)
    )
)

echo.
echo ✅ 停止完成！
pause
