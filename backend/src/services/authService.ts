import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { JWTService } from '@/utils/jwt';
import { RedisService } from '@/config/redis';
import { EmailService } from '@/services/emailService';
import { UserService } from '@/services/userService';
import { User, UserInput, UserUpdate, JwtPayload, AppError } from '@/types';
import { logger } from '@/utils/logger';
import db from '@/config/database';

export class AuthService {
  private redisService: RedisService;
  private emailService: EmailService;
  private userService: UserService;

  constructor() {
    this.redisService = new RedisService();
    this.emailService = new EmailService();
    this.userService = new UserService();
  }

  // 用户注册
  async register(userData: UserInput): Promise<{ user: User }> {
    const { email, password, name, phone } = userData;

    // 检查邮箱是否已存在
    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      throw new AppError('邮箱已被注册', 400);
    }

    // 加密密码
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 创建用户
    const user = await this.userService.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role: 'user',
      plan: 'free',
      emailVerified: false,
    });

    // 发送邮箱验证码
    await this.sendEmailVerification(email, 'register');

    logger.info('用户注册成功', { userId: user.id, email });

    return { user };
  }

  // 用户登录
  async login(email: string, password: string): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    // 查找用户
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new AppError('邮箱或密码错误', 401);
    }

    // 验证密码
    if (!user.password) {
      throw new AppError('用户账户异常', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError('邮箱或密码错误', 401);
    }

    // 更新最后登录时间
    await this.userService.update(user.id, { lastLoginAt: new Date() });

    // 生成令牌
    const accessToken = JWTService.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
    });

    const refreshToken = JWTService.generateRefreshToken(user.id);

    // 缓存用户会话
    await this.redisService.cacheUserSession(user.id, {
      id: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
      loginAt: new Date(),
    }, 24);

    logger.info('用户登录成功', { userId: user.id, email });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        plan: user.plan,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
      },
      accessToken,
      refreshToken,
    };
  }

  // 发送邮箱验证码
  async sendEmailVerification(email: string, type: 'register' | 'login' | 'reset' = 'register'): Promise<void> {
    // 生成6位验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 缓存验证码
    await this.redisService.cacheEmailVerification(email, code, 5); // 5分钟过期

    // 发送邮件
    try {
      await this.emailService.sendVerificationCode(email, code, type);
      logger.info('验证码发送成功', { email, type });
    } catch (error) {
      logger.error('验证码发送失败', { email, type, error });
      throw new AppError('验证码发送失败，请稍后重试', 500);
    }
  }

  // 验证邮箱
  async verifyEmail(email: string, code: string): Promise<{ user: User }> {
    // 检查验证码
    const cachedCode = await this.redisService.getEmailVerification(email);
    if (!cachedCode || cachedCode !== code) {
      throw new AppError('验证码错误或已过期', 400);
    }

    // 查找用户
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new AppError('用户不存在', 404);
    }

    // 更新邮箱验证状态
    await this.userService.update(user.id, { emailVerified: true });

    // 删除验证码缓存
    await this.redisService.del(`email_verification:${email}`);

    logger.info('邮箱验证成功', { userId: user.id, email });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      plan: user.plan,
      emailVerified: true,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  // 刷新令牌
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = JWTService.verifyToken(refreshToken);

      // 检查用户是否仍然存在且有效
      const user = await this.userService.findById(decoded.userId);
      if (!user) {
        throw new AppError('用户不存在', 401);
      }

      // 生成新的令牌
      const newAccessToken = JWTService.generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        plan: user.plan,
      });

      const newRefreshToken = JWTService.generateRefreshToken(user.id);

      // 更新会话缓存
      await this.redisService.cacheUserSession(user.id, {
        id: user.id,
        email: user.email,
        role: user.role,
        plan: user.plan,
        lastActivity: new Date(),
      }, 24);

      logger.info('令牌刷新成功', { userId: user.id });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new AppError('刷新令牌无效或已过期', 401);
    }
  }

  // 获取用户信息
  async getUserProfile(userId: string): Promise<User> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new AppError('用户不存在', 404);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      plan: user.plan,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  // 更新用户信息
  async updateUserProfile(userId: string, updateData: UserUpdate): Promise<User> {
    const user = await this.userService.update(userId, updateData);

    // 更新会话缓存
    await this.redisService.cacheUserSession(userId, {
      id: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
      lastActivity: new Date(),
    }, 24);

    logger.info('用户信息更新成功', { userId, updateData });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      plan: user.plan,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  // 修改密码
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userService.findById(userId);
    if (!user || !user.password) {
      throw new AppError('用户不存在', 404);
    }

    // 验证当前密码
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new AppError('当前密码错误', 400);
    }

    // 加密新密码
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // 更新密码
    await this.userService.update(userId, { password: hashedNewPassword });

    logger.info('密码修改成功', { userId });
  }

  // 发送密码重置邮件
  async sendPasswordResetEmail(email: string): Promise<void> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      // 为了安全，即使用户不存在也返回成功
      return;
    }

    // 生成重置令牌
    const resetToken = JWTService.generateTemporaryToken(
      { userId: user.id, email: user.email, type: 'password_reset' },
      30 // 30分钟过期
    );

    // 发送重置邮件
    try {
      await this.emailService.sendPasswordReset(email, resetToken);
      logger.info('密码重置邮件发送成功', { email });
    } catch (error) {
      logger.error('密码重置邮件发送失败', { email, error });
      throw new AppError('密码重置邮件发送失败，请稍后重试', 500);
    }
  }

  // 重置密码
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const decoded = JWTService.verifyTemporaryToken(token);

      if (decoded.type !== 'password_reset') {
        throw new AppError('无效的重置令牌', 400);
      }

      const user = await this.userService.findById(decoded.userId);
      if (!user) {
        throw new AppError('用户不存在', 404);
      }

      // 加密新密码
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // 更新密码
      await this.userService.update(user.id, { password: hashedPassword });

      logger.info('密码重置成功', { userId: user.id });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('重置令牌无效或已过期', 400);
    }
  }

  // 用户登出
  async logout(userId: string): Promise<void> {
    // 删除用户会话缓存
    await this.redisService.del(`session:${userId}`);

    logger.info('用户登出', { userId });
  }

  // 检查用户名是否可用
  async isUsernameAvailable(username: string): Promise<boolean> {
    const existingUser = await this.userService.findByName(username);
    return !existingUser;
  }

  // 检查邮箱是否可用
  async isEmailAvailable(email: string): Promise<boolean> {
    const existingUser = await this.userService.findByEmail(email);
    return !existingUser;
  }
}

export default AuthService;