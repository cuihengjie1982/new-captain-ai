# Captain AI 后端 API 服务

基于 Node.js + TypeScript + PostgreSQL + Redis 的现代化 RESTful API 服务。

## 🚀 功能特性

- **用户认证与授权** - JWT认证，邮箱验证，角色权限控制
- **博客管理** - 文章CRUD，分类管理，搜索功能
- **评论系统** - 评论发布，回复，点赞功能
- **AI聊天服务** - 集成Gemini AI，智能对话
- **用户数据管理** - 笔记，历史记录，个人设置
- **文件上传** - 头像，文章图片上传
- **实时通信** - WebSocket支持实时通知
- **数据分析** - 用户行为统计，内容分析
- **安全防护** - 速率限制，数据验证，SQL注入防护

## 📋 技术栈

- **运行时**: Node.js 18+
- **框架**: Express.js
- **语言**: TypeScript
- **数据库**: PostgreSQL 13+
- **缓存**: Redis 6+
- **认证**: JWT + bcrypt
- **验证**: Joi
- **ORM**: Knex.js
- **实时通信**: Socket.IO
- **日志**: Winston
- **文件上传**: Multer
- **邮件服务**: Nodemailer

## 🔧 环境要求

- Node.js 18.0+
- PostgreSQL 13+
- Redis 6+
- npm 或 yarn

## 📦 安装与配置

### 1. 克隆项目
```bash
git clone <repository-url>
cd backend
```

### 2. 安装依赖
```bash
npm install
```

### 3. 环境配置
复制环境变量配置文件：
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下变量：
```bash
# 服务器配置
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=captain_ai
DB_USER=postgres
DB_PASSWORD=your_password

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT配置
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# 邮件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# Gemini AI配置
GEMINI_API_KEY=your_gemini_api_key

# 文件上传配置
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,image/webp

# 安全配置
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS配置
CORS_ORIGIN=http://localhost:3002,https://captainai.cc

# 日志配置
LOG_LEVEL=info
LOG_FILE=logs/app.log
```

### 4. 数据库初始化
```bash
# 运行数据库迁移
npm run migrate

# 运行种子数据（可选）
npm run seed
```

## 🚀 启动服务

### 开发环境
```bash
npm run dev
```

### 生产环境
```bash
# 构建项目
npm run build

# 启动服务
npm start
```

## 📚 API 文档

### 认证相关 API
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/send-verification` - 发送邮箱验证码
- `POST /api/auth/verify-email` - 验证邮箱
- `POST /api/auth/refresh` - 刷新令牌
- `GET /api/auth/profile` - 获取用户信息
- `PUT /api/auth/profile` - 更新用户信息
- `POST /api/auth/logout` - 用户登出

### 博客相关 API
- `GET /api/blog/posts` - 获取文章列表
- `GET /api/blog/posts/:id` - 获取文章详情
- `POST /api/blog/posts` - 创建文章 [需认证]
- `PUT /api/blog/posts/:id` - 更新文章 [需认证]
- `DELETE /api/blog/posts/:id` - 删除文章 [需认证]
- `POST /api/blog/posts/:id/like` - 文章点赞 [需认证]
- `GET /api/blog/categories` - 获取分类列表
- `GET /api/blog/search` - 搜索文章

### 评论相关 API
- `GET /api/comments/:postId` - 获取文章评论
- `POST /api/comments/:postId` - 发布评论 [需认证]
- `POST /api/comments/:postId/:commentId` - 回复评论 [需认证]
- `PUT /api/comments/:like` - 评论点赞 [需认证]
- `DELETE /api/comments/:commentId` - 删除评论 [需认证]

### 用户相关 API
- `GET /api/user/history/videos` - 获取视频历史 [需认证]
- `GET /api/user/history/articles` - 获取文章历史 [需认证]
- `GET /api/user/notes` - 获取用户笔记 [需认证]
- `POST /api/user/notes` - 创建笔记 [需认证]
- `PUT /api/user/notes/:id` - 更新笔记 [需认证]
- `DELETE /api/user/notes/:id` - 删除笔记 [需认证]
- `GET /api/user/analytics` - 获取用户分析数据 [需认证]

### AI聊天相关 API
- `POST /api/chat/create-session` - 创建聊天会话 [需认证]
- `POST /api/chat/send-message` - 发送消息 [需认证]
- `GET /api/chat/history/:sessionId` - 获取聊天历史 [需认证]
- `POST /api/chat/analyze-text` - 文本分析 [需认证]

### 文件上传 API
- `POST /api/upload/avatar` - 上传头像 [需认证]
- `POST /api/upload/blog` - 上传博客图片 [需认证]

### 管理员 API
- `GET /api/admin/users` - 获取用户列表 [需管理员]
- `PUT /api/admin/users/:id/role` - 更新用户角色 [需管理员]
- `GET /api/admin/analytics` - 获取系统分析数据 [需管理员]

## 🔒 认证与授权

API 使用 JWT (JSON Web Token) 进行身份验证：

1. 用户登录后获得访问令牌
2. 在请求头中添加令牌：`Authorization: Bearer <token>`
3. 令牌有效期为 7 天
4. 可以使用刷新令牌获取新的访问令牌

## 📝 请求/响应格式

### 成功响应
```json
{
  "success": true,
  "message": "操作成功",
  "data": {
    // 响应数据
  }
}
```

### 分页响应
```json
{
  "success": true,
  "message": "获取数据成功",
  "data": [
    // 数据列表
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 错误响应
```json
{
  "success": false,
  "message": "错误描述",
  "error": "详细错误信息（开发环境）"
}
```

## 🛠 开发工具

### 数据库迁移
```bash
# 创建新的迁移文件
npm run migrate:make <migration_name>

# 运行迁移
npm run migrate

# 回滚迁移
npm run migrate:rollback
```

### 代码检查
```bash
# 运行 ESLint
npm run lint

# 运行测试
npm test
```

### 日志管理
日志文件位置：`logs/app.log`

### API 测试
可以使用 Postman 或 curl 工具测试 API：

```bash
# 用户注册
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"测试用户","email":"test@example.com","password":"123456"}'

# 用户登录
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}'
```

## 🔧 部署

### Docker 部署
```bash
# 构建镜像
docker build -t captain-ai-backend .

# 运行容器
docker run -p 3001:3001 --env-file .env captain-ai-backend
```

### PM2 部署
```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs
```

## 📊 监控与日志

- **健康检查**: GET /health
- **API文档**: GET /api/docs (可选)
- **日志级别**: error, warn, info, http, debug
- **性能监控**: 响应时间，错误率等

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

MIT License

## 📞 支持

如有问题，请联系：
- 邮箱: support@captainai.cc
- 文档: https://docs.captainai.cc
- 问题反馈: https://github.com/captain-ai/backend/issues