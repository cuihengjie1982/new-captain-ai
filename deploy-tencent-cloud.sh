#!/bin/bash

# 腾讯云轻量服务器部署脚本
# Captain AI 项目部署

set -e

echo "🚀 开始部署 Captain AI 到腾讯云轻量服务器..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查必要的工具
check_requirements() {
    log_info "检查必要的工具..."

    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装，请先安装 Node.js"
        exit 1
    fi

    # 检查 npm
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装，请先安装 npm"
        exit 1
    fi

    # 检查 git
    if ! command -v git &> /dev/null; then
        log_error "git 未安装，请先安装 git"
        exit 1
    fi

    # 检查 PostgreSQL
    if ! command -v psql &> /dev/null; then
        log_warn "PostgreSQL 客户端未安装，请手动安装 PostgreSQL"
    fi

    log_info "工具检查完成"
}

# 设置环境变量
setup_environment() {
    log_info "设置环境变量..."

    # 创建 .env 文件
    if [ ! -f .env ]; then
        log_info "创建 .env 配置文件..."
        cat > .env << EOF
# 服务器配置
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# 数据库配置 (请根据实际情况修改)
DATABASE_URL=postgresql://captainai:your_password@localhost:5432/captainai
DB_HOST=localhost
DB_PORT=5432
DB_NAME=captainai
DB_USER=captainai
DB_PASSWORD=your_password

# Redis配置 (可选)
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# AI服务配置
DEEPSEEK_API_KEY=your_deepseek_api_key
GEMINI_API_KEY=your_gemini_api_key

# CORS配置
CORS_ORIGIN=https://yourdomain.com,http://localhost:3004

# 安全配置
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# 文件上传配置
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx
EOF
        log_warn "请编辑 .env 文件，设置正确的数据库密码和API密钥"
        log_warn "特别注意："
        log_warn "1. 设置 DB_PASSWORD 为您的PostgreSQL密码"
        log_warn "2. 设置 JWT_SECRET 为随机字符串"
        log_warn "3. 设置 DEEPSEEK_API_KEY 和 GEMINI_API_KEY"
        log_warn "4. 设置 CORS_ORIGIN 为您的域名"
        read -p "按 Enter 键继续..."
    else
        log_info ".env 文件已存在，跳过创建"
    fi
}

# 安装依赖
install_dependencies() {
    log_info "安装前端依赖..."
    npm install

    log_info "安装后端依赖..."
    cd backend
    npm install
    cd ..
}

# 构建项目
build_project() {
    log_info "构建前端项目..."
    npm run build

    log_info "构建后端项目..."
    cd backend
    npm run build
    cd ..
}

# 配置数据库
setup_database() {
    log_info "配置数据库..."

    # 检查 PostgreSQL 是否运行
    if ! pg_isready -h localhost -p 5432 &> /dev/null; then
        log_warn "PostgreSQL 未运行，请启动 PostgreSQL 服务"
        log_info "Ubuntu/Debian: sudo systemctl start postgresql"
        log_info "CentOS: sudo systemctl start postgresql"
        read -p "确保 PostgreSQL 运行后按 Enter 键继续..."
    fi

    # 创建数据库（如果不存在）
    cd backend
    log_info "运行数据库迁移..."
    npm run migrate

    log_info "数据库设置完成"
    cd ..
}

# 设置防火墙
setup_firewall() {
    log_info "配置防火墙..."

    # Ubuntu/Debian
    if command -v ufw &> /dev/null; then
        sudo ufw allow 3001
        sudo ufw allow 80
        sudo ufw allow 443
        log_info "防火墙规则已添加 (3001, 80, 443)"
    # CentOS
    elif command -v firewall-cmd &> /dev/null; then
        sudo firewall-cmd --permanent --add-port=3001/tcp
        sudo firewall-cmd --permanent --add-port=80/tcp
        sudo firewall-cmd --permanent --add-port=443/tcp
        sudo firewall-cmd --reload
        log_info "防火墙规则已添加 (3001, 80, 443)"
    else
        log_warn "无法自动配置防火墙，请手动开放端口：3001, 80, 443"
    fi
}

# 创建系统服务
create_systemd_service() {
    log_info "创建系统服务..."

    sudo tee /etc/systemd/system/captain-ai.service > /dev/null << EOF
[Unit]
Description=Captain AI Application
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=$(pwd)
Environment=NODE_ENV=production
EnvironmentFile=$(pwd)/.env
ExecStart=/usr/bin/node production-server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=captain-ai

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable captain-ai

    log_info "系统服务已创建并启用"
}

# 启动应用
start_application() {
    log_info "启动 Captain AI 应用..."

    sudo systemctl start captain-ai

    # 等待服务启动
    sleep 5

    if sudo systemctl is-active --quiet captain-ai; then
        log_info "✅ Captain AI 启动成功！"
        log_info "服务状态: $(sudo systemctl status captain-ai --no-pager -l)"
        log_info "应用地址: http://$(curl -s ifconfig.me):3001"
        log_info "健康检查: http://$(curl -s ifconfig.me):3001/health"
    else
        log_error "❌ Captain AI 启动失败"
        sudo systemctl status captain-ai --no-pager -l
        exit 1
    fi
}

# 显示部署信息
show_deployment_info() {
    echo ""
    echo "🎉 部署完成！"
    echo ""
    echo "📋 重要信息："
    echo "• 服务名称: captain-ai"
    echo "• 服务端口: 3001"
    echo "• 应用地址: http://$(curl -s ifconfig.me):3001"
    echo "• 健康检查: http://$(curl -s ifconfig.me):3001/health"
    echo ""
    echo "🔧 常用命令："
    echo "• 查看服务状态: sudo systemctl status captain-ai"
    echo "• 启动服务: sudo systemctl start captain-ai"
    echo "• 停止服务: sudo systemctl stop captain-ai"
    echo "• 重启服务: sudo systemctl restart captain-ai"
    echo "• 查看日志: sudo journalctl -u captain-ai -f"
    echo ""
    echo "📁 重要文件："
    echo "• 配置文件: $(pwd)/.env"
    echo "• 服务文件: /etc/systemd/system/captain-ai.service"
    echo "• 日志文件: sudo journalctl -u captain-ai"
    echo ""
    echo "⚠️  注意事项："
    echo "• 请确保已正确配置 .env 文件中的数据库密码"
    echo "• 请配置域名指向服务器IP"
    echo "• 建议配置SSL证书启用HTTPS"
    echo "• 定期备份数据库"
}

# 主函数
main() {
    echo "Captain AI 腾讯云部署脚本"
    echo "================================"

    # 检查是否在正确的目录
    if [ ! -f "package.json" ] || [ ! -f "backend/package.json" ]; then
        log_error "请在项目根目录运行此脚本"
        exit 1
    fi

    # 执行部署步骤
    check_requirements
    setup_environment
    install_dependencies
    build_project
    setup_database
    setup_firewall
    create_systemd_service
    start_application
    show_deployment_info

    log_info "🚀 部署完成！"
}

# 运行主函数
main "$@"