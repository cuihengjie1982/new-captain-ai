import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class ErrorHandler {
  static handle(err: AppError, req: Request, res: Response): void {
    let error = { ...err };
    error.message = err.message;

    // Log error
    logger.error('Error Handler', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Default error
    let statusCode = 500;
    let message = '服务器内部错误';

    // Custom error handling
    if (err.name === 'ValidationError') {
      statusCode = 400;
      message = '数据验证失败';
    } else if (err.name === 'CastError') {
      statusCode = 400;
      message = '无效的数据格式';
    } else if (err.name === 'UnauthorizedError') {
      statusCode = 401;
      message = '未授权访问';
    } else if (err.statusCode) {
      statusCode = err.statusCode;
      message = error.message;
    }

    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';

    res.status(statusCode).json({
      success: false,
      message,
      ...(isDevelopment && { error: error.message, stack: error.stack })
    });
  }
}

// Global error handler middleware
export const globalErrorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  ErrorHandler.handle(err, req, res);
};