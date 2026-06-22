#!/bin/bash
# 停止评测机和主服务

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🛑 停止 Scratch 判题系统..."

# 停止评测机 (端口 3001)
JUDGE_PID=$(netstat -ano 2>/dev/null | grep ":3001 " | grep "LISTENING" | awk '{print $5}' | head -1)
if [ -n "$JUDGE_PID" ]; then
    taskkill //F //PID "$JUDGE_PID" >nul 2>&1
    echo "  已停止评测机 (PID: $JUDGE_PID)"
else
    echo "  评测机未运行"
fi

# 停止主服务 (端口 3000)
OJ_PID=$(netstat -ano 2>/dev/null | grep ":3000 " | grep "LISTENING" | awk '{print $5}' | head -1)
if [ -n "$OJ_PID" ]; then
    taskkill //F //PID "$OJ_PID" >nul 2>&1
    echo "  已停止主服务 (PID: $OJ_PID)"
else
    echo "  主服务未运行"
fi

# 清理 PID 文件
rm -f "$SCRIPT_DIR/.judge.pid" "$SCRIPT_DIR/.oj.pid"

echo ""
echo "✅ 停止完成！"
