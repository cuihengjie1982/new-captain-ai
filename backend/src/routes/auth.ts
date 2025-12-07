import { Router } from 'express';
import Joi from 'joi';
import { AuthMiddleware, ValidationMiddleware, asyncHandler } from '@/middleware';
import { AuthService } from '@/services/authService';
import { ApiResponse, User } from '@/types';
import { logger } from '@/utils/logger';

const router = Router();
const authService = new AuthService();

// 用户注册
router.post(
  '/register',
  ValidationMiddleware.validate(ValidationMiddleware.schemas.register),
  asyncHandler(async (req, res) => {
    const { name, email, password, phone } = req.body;

    const result = await authService.register({
      name,
      email,
      password,
      phone,
    });

    logger.userAction(result.user.id, 'register', { email });

    const response: ApiResponse = {
      success: true,
      message: '注册成功，请查收邮箱验证码',
      data: {
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          plan: result.user.plan,
          emailVerified: result.user.emailVerified,
        },
        requiresEmailVerification: true,
      },
    };

    res.status(201).json(response);
  })
);

// 用户登录
router.post(
  '/login',
  ValidationMiddleware.validate(ValidationMiddleware.schemas.login),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const result = await authService.login(email, password);

    logger.userAction(result.user.id, 'login', { email });

    const response: ApiResponse = {
      success: true,
      message: '登录成功',
      data: {
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          plan: result.user.plan,
          avatar: result.user.avatar,
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: 7 * 24 * 60 * 60, // 7天
      },
    };

    res.status(200).json(response);
  })
);

// 发送邮箱验证码
router.post(
  '/send-verification',
  ValidationMiddleware.validate(ValidationMiddleware.schemas.sendVerification),
  AuthMiddleware.rateLimiter(5, 60 * 1000), // 1分钟内最多5次
  asyncHandler(async (req, res) => {
    const { email, type } = req.body;

    await authService.sendEmailVerification(email, type);

    const response: ApiResponse = {
      success: true,
      message: '验证码已发送到您的邮箱',
    };

    res.status(200).json(response);
  })
);

// 验证邮箱验证码
router.post(
  '/verify-email',
  ValidationMiddleware.validate(ValidationMiddleware.schemas.verifyEmail),
  asyncHandler(async (req, res) => {
    const { email, code } = req.body;

    const result = await authService.verifyEmail(email, code);

    logger.userAction(result.user.id, 'email_verified', { email });

    const response: ApiResponse = {
      success: true,
      message: '邮箱验证成功',
      data: {
        emailVerified: true,
      },
    };

    res.status(200).json(response);
  })
);

// 刷新令牌
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: '缺少刷新令牌',
      });
    }

    const result = await authService.refreshToken(refreshToken);

    const response: ApiResponse = {
      success: true,
      message: '令牌刷新成功',
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: 7 * 24 * 60 * 60,
      },
    };

    res.status(200).json(response);
  })
);

// 获取用户信息
router.get(
  '/profile',
  AuthMiddleware.authenticate,
  asyncHandler(async (req: any, res) => {
    const user = await authService.getUserProfile(req.user.userId);

    const response: ApiResponse = {
      success: true,
      message: '获取用户信息成功',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        plan: user.plan,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
    };

    res.status(200).json(response);
  })
);

// 更新用户信息
router.put(
  '/profile',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validate(ValidationMiddleware.schemas.updateUser),
  asyncHandler(async (req: any, res) => {
    const userId = req.user.userId;
    const updateData = req.body;

    const user = await authService.updateUserProfile(userId, updateData);

    logger.userAction(userId, 'profile_updated', updateData);

    const response: ApiResponse = {
      success: true,
      message: '用户信息更新成功',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        plan: user.plan,
      },
    };

    res.status(200).json(response);
  })
);

// 修改密码
router.put(
  '/password',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validate({
    body: {
      currentPassword: Joi.string().required().messages({
        'any.required': '当前密码是必填项',
      }),
      newPassword: ValidationMiddleware.rules.password,
    },
  }),
  asyncHandler(async (req: any, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    await authService.changePassword(userId, currentPassword, newPassword);

    logger.userAction(userId, 'password_changed');

    const response: ApiResponse = {
      success: true,
      message: '密码修改成功',
    };

    res.status(200).json(response);
  })
);

// 忘记密码
router.post(
  '/forgot-password',
  ValidationMiddleware.validate({
    body: {
      email: ValidationMiddleware.rules.email,
    },
  }),
  AuthMiddleware.rateLimiter(3, 60 * 1000), // 1分钟内最多3次
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    await authService.sendPasswordResetEmail(email);

    const response: ApiResponse = {
      success: true,
      message: '密码重置邮件已发送',
    };

    res.status(200).json(response);
  })
);

// 重置密码
router.post(
  '/reset-password',
  ValidationMiddleware.validate({
    body: {
      token: Joi.string().required().messages({
        'any.required': '重置令牌是必填项',
      }),
      newPassword: ValidationMiddleware.rules.password,
    },
  }),
  asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    await authService.resetPassword(token, newPassword);

    const response: ApiResponse = {
      success: true,
      message: '密码重置成功',
    };

    res.status(200).json(response);
  })
);

// 用户登出
router.post(
  '/logout',
  AuthMiddleware.authenticate,
  asyncHandler(async (req: any, res) => {
    const userId = req.user.userId;

    await authService.logout(userId);

    logger.userAction(userId, 'logout');

    const response: ApiResponse = {
      success: true,
      message: '登出成功',
    };

    res.status(200).json(response);
  })
);

// 检查用户名是否可用
router.get(
  '/check-username',
  ValidationMiddleware.validate({
    query: {
      username: Joi.string().required().messages({
        'any.required': '用户名是必填项',
      }),
    },
  }),
  asyncHandler(async (req, res) => {
    const { username } = req.query;

    const available = await authService.isUsernameAvailable(username as string);

    const response: ApiResponse = {
      success: true,
      message: '检查完成',
      data: {
        available,
      },
    };

    res.status(200).json(response);
  })
);

// 检查邮箱是否可用
router.get(
  '/check-email',
  ValidationMiddleware.validate({
    query: {
      email: Joi.string().email().required().messages({
        'string.email': '请输入有效的邮箱地址',
        'any.required': '邮箱是必填项',
      }),
    },
  }),
  asyncHandler(async (req, res) => {
    const { email } = req.query;

    const available = await authService.isEmailAvailable(email as string);

    const response: ApiResponse = {
      success: true,
      message: '检查完成',
      data: {
        available,
      },
    };

    res.status(200).json(response);
  })
);

export default router;