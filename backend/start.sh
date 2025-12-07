#!/bin/bash

# Captain AI 后端服务启动脚本

set -e

echo "🚀 启动 Captain AI 后端服务..."

# 检查 Node.js 版本
echo "📋 检查 Node.js 版本..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 18+"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2)
echo "✅ Node.js 版本: $NODE_VERSION"

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 请在 backend 目录下运行此脚本"
    exit 1
fi

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "📝 环境变量文件不存在，正在创建..."
    cp .env.example .env
    echo "⚠️  请编辑 .env 文件配置必要的环境变量"
    echo "   - 数据库连接信息"
    echo "   - Redis 连接信息"
    echo "   - JWT 密钥"
    echo "   - Gemini API Key"
    echo "   - 邮件配置"
    echo ""
    echo "配置完成后请重新运行此脚本"
    exit 1
fi

# 安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
else
    echo "📦 检查依赖完整性..."
    npm ci
fi

# 构建项目
echo "🔨 构建 TypeScript 项目..."
npm run build

# 检查数据库连接（如果配置了数据库）
if grep -q "DB_HOST" .env; then
    echo "🗄️  检查数据库连接..."
    npm run migrate || echo "⚠️  数据库迁移失败，请检查数据库配置"
fi

# 创建日志目录
echo "📝 创建日志目录..."
mkdir -p logs

# 检查端口是否被占用
PORT=${PORT:-3001}
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  端口 $PORT 已被占用，正在尝试终止占用进程..."
    pkill -f "node.*server.js" || true
    sleep 2
fi

# 启动服务
echo "🎯 启动服务..."
echo "📍 服务地址: http://localhost:$PORT"
echo "📍 健康检查: http://localhost:$PORT/health"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

# 根据环境选择启动方式
if [ "$NODE_ENV" = "production" ]; then
    echo "🏭 生产环境模式启动..."
    npm start
else
    echo "🛠️  开发环境模式启动..."
    npm run dev
fi