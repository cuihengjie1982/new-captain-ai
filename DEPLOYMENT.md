# Captain AI 网站部署指南

## 项目概述

Captain AI 是一个现代化的AI交互平台，现已从 localStorage 架构升级为全栈架构，具备真实的用户交互功能。

## 技术栈

### 前端
- React 18 + TypeScript
- TailwindCSS
- React Router
- Axios
- Google Gemini AI SDK

### 后端
- Node.js + Express
- TypeScript
- PostgreSQL
- Redis
- JWT Authentication
- Google Gemini AI

## 本地开发环境设置

### 1. 环境要求
- Node.js 18+
- npm 8+
- PostgreSQL 14+
- Redis 6+

### 2. 前端设置

```bash
# 进入前端目录
cd /Users/tree/Desktop/精细化交互产品网站/1306开发产品

# 安装依赖
npm install

# 配置环境变量
cp .env.local.example .env.local
# 编辑 .env.local 添加必要的配置

# 启动开发服务器
npm run dev
```

### 3. 后端设置

```bash
# 进入后端目录
cd /Users/tree/Desktop/精细化交互产品网站/1306开发产品/backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 添加数据库和其他配置

# 运行数据库迁移
npm run migrate

# 启动开发服务器（简单版本）
node dev-server.js

# 或者构建并启动生产版本
npm run build
npm start
```

### 4. 环境变量配置

#### 前端 (.env.local)
```env
# AI服务配置
GEMINI_API_KEY=your-gemini-api-key

# 后端API配置
REACT_APP_API_URL=http://localhost:3001/api
```

#### 后端 (.env)
```env
# 数据库配置
DATABASE_URL=postgresql://captainai:ABLwmXhH6rrN3cMN@localhost:5432/captainai
DB_HOST=localhost
DB_PORT=5432
DB_NAME=captainai
DB_USER=captainai
DB_PASSWORD=ABLwmXhH6rrN3cMN

# Redis配置
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# AI服务配置
GEMINI_API_KEY=sk-yk8uGEZwI3Bva9jVWSOp6hznyaWHzESjyyxz2dWLH0QLXxm3

# 服务器配置
PORT=3001
NODE_ENV=development

# 文件上传配置
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx

# 安全配置
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 生产环境部署

### 1. 服务器要求
- Ubuntu 20.04+ 或 CentOS 8+
- 至少 2GB RAM, 2 CPU
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Nginx
- SSL证书

### 2. 域名和DNS配置
- 域名: captainai.cc
- 需要配置A记录指向服务器IP (43.138.244.44)

### 3. 部署步骤

#### 步骤1: 服务器环境设置

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装PostgreSQL
sudo apt install postgresql postgresql-contrib -y
sudo -u postgres createuser captain
sudo -u postgres createdb captain_ai
sudo -u postgres psql -c "ALTER USER captain PASSWORD 'your_password';"

# 安装Redis
sudo apt install redis-server -y

# 安装Nginx
sudo apt install nginx -y

# 安装PM2
sudo npm install -g pm2
```

#### 步骤2: 部署代码

```bash
# 创建项目目录
sudo mkdir -p /var/www/captainai
sudo chown $USER:$USER /var/www/captainai

# 克隆或上传代码到服务器
# (可以使用git clone, scp, 或rsync)

cd /var/www/captainai

# 安装前端依赖
npm install

# 构建前端
npm run build

# 安装后端依赖
cd backend
npm install

# 构建后端
npm run build
```

#### 步骤3: 数据库设置

```bash
# 运行数据库迁移
cd /var/www/captainai/backend
npm run migrate
```

#### 步骤4: 配置环境变量

创建生产环境配置文件:

```bash
# 后端环境变量
sudo nano /var/www/captainai/backend/.env
```

```env
DATABASE_URL=postgresql://captain:your_password@localhost:5432/captain_ai
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secure-jwt-secret
JWT_REFRESH_SECRET=your-super-secure-refresh-secret
GEMINI_API_KEY=your-production-gemini-key
PORT=3001
NODE_ENV=production
```

#### 步骤5: 启动应用

```bash
# 使用PM2启动后端服务
cd /var/www/captainai/backend
pm2 start dist/server.js --name "captainai-backend"

# 配置PM2自启动
pm2 startup
pm2 save
```

#### 步骤6: 配置Nginx

创建Nginx配置文件:

```bash
sudo nano /etc/nginx/sites-available/captainai
```

```nginx
server {
    listen 80;
    server_name captainai.cc www.captainai.cc;

    # 前端静态文件
    location / {
        root /var/www/captainai/dist;
        try_files $uri $uri/ /index.html;
    }

    # API代理
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/captainai /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

#### 步骤7: SSL证书配置

```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取SSL证书
sudo certbot --nginx -d captainai.cc -d www.captainai.cc

# 设置自动续期
sudo crontab -e
# 添加: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 4. 监控和维护

#### 查看应用状态
```bash
# PM2状态
pm2 status

# 查看日志
pm2 logs captainai-backend

# 重启应用
pm2 restart captainai-backend
```

#### 数据库备份
```bash
# 创建备份脚本
sudo nano /usr/local/bin/backup-captainai.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/captainai"
mkdir -p $BACKUP_DIR

# 数据库备份
pg_dump captain_ai > $BACKUP_DIR/captainai_db_$DATE.sql

# 删除7天前的备份
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
```

```bash
# 设置执行权限
sudo chmod +x /usr/local/bin/backup-captainai.sh

# 设置定时备份 (每天凌晨2点)
sudo crontab -e
# 添加: 0 2 * * * /usr/local/bin/backup-captainai.sh
```

## 当前开发状态

### ✅ 已完成
1. **前端架构升级**
   - 创建了完整的API服务层
   - 替换localStorage为真实API调用
   - 支持用户认证、博客管理、评论系统、AI聊天

2. **后端API系统**
   - 用户注册/登录/权限管理
   - 博客文章CRUD操作
   - 评论系统
   - AI聊天服务集成
   - 文件上传功能

3. **开发环境**
   - 前端开发服务器 (localhost:3002)
   - 后端API服务器 (localhost:3001)
   - 环境变量配置

### 🚧 进行中
- 生产环境部署优化
- 性能调优
- 安全加固

### 📋 待完成
- 单元测试
- E2E测试
- 性能监控
- 日志系统优化

## API接口文档

### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/profile` - 获取用户信息

### 博客相关
- `GET /api/blog/posts` - 获取文章列表
- `GET /api/blog/posts/:id` - 获取文章详情
- `POST /api/blog/posts` - 创建文章
- `PUT /api/blog/posts/:id` - 更新文章
- `DELETE /api/blog/posts/:id` - 删除文章

### 评论相关
- `GET /api/comments/:postId` - 获取文章评论
- `POST /api/comments/:postId` - 发表评论

### AI聊天
- `POST /api/chat/send-message` - 发送聊天消息
- `GET /api/chat/sessions` - 获取聊天会话列表

## 故障排除

### 常见问题

1. **前端无法访问后端API**
   - 检查后端服务是否启动: `pm2 status`
   - 检查端口是否被占用: `netstat -tlnp | grep 3001`
   - 检查Nginx配置: `sudo nginx -t`

2. **数据库连接失败**
   - 检查PostgreSQL服务: `sudo systemctl status postgresql`
   - 检查数据库连接: `psql -h localhost -U captain -d captain_ai`

3. **Redis连接失败**
   - 检查Redis服务: `sudo systemctl status redis`
   - 测试连接: `redis-cli ping`

## 联系支持

如果遇到部署问题，请提供以下信息:
- 服务器操作系统版本
- Node.js版本
- 错误日志内容
- 具体的错误步骤

---

**部署完成后，网站将在 https://captainai.cc 上线运行！**