@echo off
REM 启动评测机和主服务

echo 🚀 启动 Scratch 判题系统...

REM 启动评测机（后台运行）
echo   启动评测机 (端口 3001)...
cd /d "%~dp0scratch-judge-server"
start "评测机" cmd /c "npm start"

REM 等待评测机启动
timeout /t 2 /nobreak >nul

REM 启动主服务（后台运行）
echo   启动主服务 (端口 3000)...
cd /d "%~dp0scratch-oj-server"
start "主服务" cmd /c "npm start"

echo.
echo ✅ 启动完成！
echo    评测机: http://localhost:3001
echo    主服务: http://localhost:3000
echo.
echo 使用 stop.bat 停止服务
pause
