import winston from 'winston';
import path from 'path';

// 日志级别
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// 日志颜色
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// 日志格式
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  ),
);

// 生产环境日志格式
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// 文件传输器
const transports = [
  // 控制台输出
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? productionFormat : format,
  }),

  // 错误日志文件
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'error.log'),
    level: 'error',
    format: productionFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),

  // 所有日志文件
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'combined.log'),
    format: productionFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// 创建logger实例
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  levels,
  format: productionFormat,
  transports,
  exitOnError: false,
});

// 在非生产环境添加控制台输出
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: format,
  }));
}

// 创建日志目录
import fs from 'fs';
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 扩展logger功能
export class Logger {
  private winston: winston.Logger;

  constructor(service: string = 'app') {
    this.winston = logger.child({ service });
  }

  error(message: string, meta?: any) {
    this.winston.error(message, meta);
  }

  warn(message: string, meta?: any) {
    this.winston.warn(message, meta);
  }

  info(message: string, meta?: any) {
    this.winston.info(message, meta);
  }

  http(message: string, meta?: any) {
    this.winston.http(message, meta);
  }

  debug(message: string, meta?: any) {
    this.winston.debug(message, meta);
  }

  // 记录用户操作
  userAction(userId: string, action: string, details?: any) {
    this.info(`用户操作: ${action}`, {
      userId,
      action,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  // 记录API请求
  apiRequest(method: string, url: string, userId?: string, statusCode?: number, responseTime?: number) {
    this.http(`${method} ${url}`, {
      userId,
      statusCode,
      responseTime,
      timestamp: new Date().toISOString(),
    });
  }

  // 记录数据库操作
  dbOperation(operation: string, table: string, duration?: number, affected?: number) {
    this.debug(`数据库操作: ${operation}`, {
      operation,
      table,
      duration,
      affected,
      timestamp: new Date().toISOString(),
    });
  }

  // 记录安全事件
  security(event: string, details: any) {
    this.warn(`安全事件: ${event}`, {
      event,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  // 记录性能指标
  performance(metric: string, value: number, unit?: string) {
    this.info(`性能指标: ${metric}`, {
      metric,
      value,
      unit,
      timestamp: new Date().toISOString(),
    });
  }
}

export default logger;