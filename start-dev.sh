#!/bin/bash

# 健身教练APP - 稳定启动脚本
# 使用 caffeinate 防止系统休眠导致进程被杀

echo "🚀 启动健身教练APP开发服务器..."
echo ""

# 进入项目目录
cd /Users/quhongfei/Documents/code/闲聊/fitness-coach-app

# 检查并停止旧的服务器
echo "🔍 检查旧的服务器进程..."
OLD_PID=$(lsof -ti :5173)
if [ ! -z "$OLD_PID" ]; then
  echo "⚠️  发现旧进程 (PID: $OLD_PID)，正在停止..."
  kill -9 $OLD_PID 2>/dev/null
  sleep 1
  echo "✅ 旧进程已停止"
fi

# 使用 caffeinate 防止休眠，并启动开发服务器
echo "🚀 启动开发服务器（防休眠模式）..."
echo ""
echo "访问地址: http://localhost:5173/"
echo "按 Ctrl+C 停止服务器"
echo ""

# caffeinate -i 表示防止系统空闲休眠
caffeinate -i pnpm dev
