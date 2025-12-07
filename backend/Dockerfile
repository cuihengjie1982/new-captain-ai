# 使用官方 Node.js 18 Alpine 镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    postgresql-client

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S captainai -u 1001

# 创建必要的目录并设置权限
RUN mkdir -p logs uploads && \
    chown -R captainai:nodejs /app

# 切换到非 root 用户
USER captainai

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# 启动应用
CMD ["npm", "start"]