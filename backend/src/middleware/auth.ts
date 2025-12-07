import { Request, Response, NextFunction } from 'express';
import { JWTService } from '@/utils/jwt';
import { RedisService } from '@/config/redis';
import { JwtPayload, AppError } from '@/types';
import { logger } from '@/utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export class AuthMiddleware {
  private redisService: RedisService;

  constructor() {
    this.redisService = new RedisService();
  }

  // 验证JWT令牌
  authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const token = JWTService.extractTokenFromHeader(req.headers.authorization);

      if (!token) {
        return res.status(401).json({
          success: false,
          message: '缺少访问令牌',
        });
      }

      // 验证令牌
      const payload = JWTService.verifyToken(token);
      req.user = payload;

      // 检查用户会话是否在Redis中存在（可选的会话验证）
      try {
        const session = await this.redisService.getUserSession(payload.userId);
        if (!session) {
          return res.status(401).json({
            success: false,
            message: '用户会话已过期，请重新登录',
          });
        }
      } catch (error) {
        // Redis连接失败时跳过会话验证
        logger.warn('Redis连接失败，跳过会话验证', { error });
      }

      next();
    } catch (error) {
      logger.error('认证失败', { error: error instanceof Error ? error.message : '未知错误' });

      return res.status(401).json({
        success: false,
        message: error instanceof Error ? error.message : '认证失败',
      });
    }
  };

  // 验证管理员权限
  requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: '用户未认证',
        });
      }

      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '需要管理员权限',
        });
      }

      next();
    } catch (error) {
      logger.error('权限验证失败', { error: error instanceof Error ? error.message : '未知错误' });

      return res.status(403).json({
        success: false,
        message: '权限验证失败',
      });
    }
  };

  // 验证Pro用户权限
  requirePro = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: '用户未认证',
        });
      }

      if (req.user.plan !== 'pro') {
        return res.status(403).json({
          success: false,
          message: '需要Pro用户权限',
        });
      }

      next();
    } catch (error) {
      logger.error('Pro权限验证失败', { error: error instanceof Error ? error.message : '未知错误' });

      return res.status(403).json({
        success: false,
        message: '权限验证失败',
      });
    }
  };

  // 可选认证（不强制要求认证）
  optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const token = JWTService.extractTokenFromHeader(req.headers.authorization);

      if (token) {
        try {
          const payload = JWTService.verifyToken(token);
          req.user = payload;
        } catch (error) {
          // 令牌无效但不阻止请求继续
          logger.warn('可选认证失败', { error: error instanceof Error ? error.message : '未知错误' });
        }
      }

      next();
    } catch (error) {
      logger.error('可选认证失败', { error: error instanceof Error ? error.message : '未知错误' });
      next();
    }
  };

  // 检查资源所有权
  checkResourceOwnership = (resourceUserIdParam: string = 'userId') => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: '用户未认证',
          });
        }

        const resourceUserId = req.params[resourceUserIdParam];

        // 管理员可以访问所有资源
        if (req.user.role === 'admin') {
          return next();
        }

        // 检查是否为资源所有者
        if (req.user.userId !== resourceUserId) {
          return res.status(403).json({
            success: false,
            message: '无权访问此资源',
          });
        }

        next();
      } catch (error) {
        logger.error('资源所有权检查失败', { error: error instanceof Error ? error.message : '未知错误' });

        return res.status(403).json({
          success: false,
          message: '资源访问权限检查失败',
        });
      }
    };
  };

  // 速率限制
  rateLimiter = (maxRequests: number, windowMs: number) => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const identifier = req.user?.userId || req.ip;
        const key = `rate_limit:${identifier}:${req.path}`;

        const allowed = await this.redisService.checkRateLimit(key, maxRequests, Math.ceil(windowMs / 1000));

        if (!allowed) {
          return res.status(429).json({
            success: false,
            message: '请求过于频繁，请稍后再试',
            retryAfter: Math.ceil(windowMs / 1000),
          });
        }

        next();
      } catch (error) {
        logger.error('速率限制检查失败', { error: error instanceof Error ? error.message : '未知错误' });
        // 速率限制失败时允许请求继续
        next();
      }
    };
  };
}

export default new AuthMiddleware();