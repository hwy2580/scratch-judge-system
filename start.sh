#!/bin/bash
# 启动评测机和主服务

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 启动 Scratch 判题系统..."

# 启动评测机（后台运行）
echo "  启动评测机 (端口 3001)..."
cd "$SCRIPT_DIR/scratch-judge-server"
npm start &
JUDGE_PID=$!
echo "  评测机 PID: $JUDGE_PID"

# 等待评测机启动
sleep 2

# 启动主服务（后台运行）
echo "  启动主服务 (端口 3000)..."
cd "$SCRIPT_DIR/scratch-oj-server"
npm start &
OJ_PID=$!
echo "  主服务 PID: $OJ_PID"

# 保存 PID 到文件
echo "$JUDGE_PID" > "$SCRIPT_DIR/.judge.pid"
echo "$OJ_PID" > "$SCRIPT_DIR/.oj.pid"

echo ""
echo "✅ 启动完成！"
echo "   评测机: http://localhost:3001"
echo "   主服务: http://localhost:3000"
echo ""
echo "使用 ./stop.sh 停止服务"
