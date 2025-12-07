import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

interface AdminRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

// 管理员权限验证中间件
export const requireAdminAuth = (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '访问令牌不存在',
        code: 'TOKEN_MISSING'
      });
    }

    // 验证token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // 检查用户角色
    if (decoded.role !== 'admin' && decoded.role !== 'super_admin') {
      logger.warn('非管理员尝试访问管理员接口', {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        path: req.path,
        ip: req.ip
      });

      return res.status(403).json({
        success: false,
        message: '权限不足，需要管理员权限',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // 将用户信息添加到请求对象
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    // 记录管理员操作日志
    logger.info('管理员接口访问', {
      userId: decoded.userId,
      email: decoded.email,
      path: req.path,
      method: req.method,
      ip: req.ip
    });

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: '访问令牌无效',
        code: 'TOKEN_INVALID'
      });
    }

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: '访问令牌已过期',
        code: 'TOKEN_EXPIRED'
      });
    }

    logger.error('管理员权限验证失败', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误',
      code: 'INTERNAL_ERROR'
    });
  }
};

// 可选的管理员验证（不强制要求，用于部分公开的管理功能）
export const optionalAdminAuth = (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // 没有token，继续执行，但不设置用户信息
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // 检查用户角色
    if (decoded.role === 'admin' || decoded.role === 'super_admin') {
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };
    }

    next();
  } catch (error) {
    // token无效，继续执行，不设置用户信息
    next();
  }
};

// 检查用户是否为资源所有者或管理员
export const requireOwnershipOrAdmin = (resourceUserField = 'userId') => {
  return (req: AdminRequest, res: Response, next: NextFunction) => {
    try {
      // 首先进行管理员权限验证
      requireAdminAuth(req, res, () => {
        // 如果已经是管理员，直接通过
        if (req.user && (req.user.role === 'admin' || req.user.role === 'super_admin')) {
          return next();
        }

        // 检查是否为资源所有者
        const resourceUserId = req.body[resourceUserField] || req.params[resourceUserField];
        const currentUserId = req.user?.userId;

        if (resourceUserId && currentUserId && resourceUserId === currentUserId) {
          return next();
        }

        return res.status(403).json({
          success: false,
          message: '权限不足，只能操作自己的资源或需要管理员权限',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      });
    } catch (error) {
      logger.error('权限验证失败', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误',
        code: 'INTERNAL_ERROR'
      });
    }
  };
};