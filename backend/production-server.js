// 生产环境服务器启动脚本
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 设置 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 手动导入模块，避免路径别名问题
import { globalErrorHandler } from './src/middleware/errorHandler.js';
import { logger } from './src/utils/logger.js';
import { connectDatabase } from './src/config/database.js';
import { connectRedis } from './src/config/redis.js';

// 路由导入
import authRoutes from './src/routes/auth.js';
import blogRoutes from './src/routes/blog.js';
import commentRoutes from './src/routes/comments.js';
import userRoutes from './src/routes/user.js';
import chatRoutes from './src/routes/chat.js';
import uploadRoutes from './src/routes/upload.js';
import communityRoutes from './src/routes/community.js';
import businessRoutes from './src/routes/business.js';

// 加载环境变量
dotenv.config();

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3002'],
    methods: ['GET', 'POST']
  }
});

const PORT = parseInt(process.env.PORT || '3001');
const HOST = process.env.HOST || '0.0.0.0';

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

// CORS配置
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3002'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 基础中间件
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 日志中间件
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// 速率限制
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15分钟
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 限制每个IP 100次请求
  message: {
    error: '请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api', limiter);

// 健康检查
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '操作成功',
    data: {
      status: 'ok',
      timestamp: new Date().toISOString()
    }
  });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/business', businessRoutes);

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在',
    path: req.originalUrl
  });
});

// 错误处理中间件
app.use(globalErrorHandler);

// Socket.IO连接处理
io.on('connection', (socket) => {
  logger.info(`用户连接: ${socket.id}`);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    logger.info(`用户 ${socket.id} 加入房间: ${roomId}`);
  });

  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    logger.info(`用户 ${socket.id} 离开房间: ${roomId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`用户断开连接: ${socket.id}`);
  });
});

// 启动服务器
async function startServer() {
  try {
    // 连接数据库
    await connectDatabase();
    logger.info('数据库连接成功');

    // 连接Redis（如果配置了）
    try {
      await connectRedis();
      logger.info('Redis连接成功');
    } catch (redisError) {
      logger.warn('Redis连接失败，继续运行:', redisError.message);
    }

    // 启动服务器
    server.listen(PORT, HOST, () => {
      logger.info(`生产服务器运行在 http://${HOST}:${PORT}`);
      logger.info(`环境: ${process.env.NODE_ENV || 'production'}`);
    });

  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，开始优雅关闭...');
  server.close(() => {
    logger.info('HTTP服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('收到SIGINT信号，开始优雅关闭...');
  server.close(() => {
    logger.info('HTTP服务器已关闭');
    process.exit(0);
  });
});

// 未捕获的异常处理
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝:', { reason, promise });
  process.exit(1);
});

// 启动服务器
startServer();