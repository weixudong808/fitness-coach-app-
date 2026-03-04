#!/bin/bash

echo "正在启动健身教练管理系统..."
echo "项目目录: $(pwd)"
echo ""

# 检查node_modules是否存在
if [ ! -d "node_modules" ]; then
    echo "正在安装依赖..."
    npm install --legacy-peer-deps
fi

# 启动开发服务器
echo "正在启动开发服务器..."
echo "请在浏览器中访问: http://localhost:5173"
echo ""
echo "登录信息:"
echo "  邮箱: coach@test.com"
echo "  密码: Coach123456"
echo ""
echo "按 Ctrl+C 停止服务器"
echo ""

npx vite
