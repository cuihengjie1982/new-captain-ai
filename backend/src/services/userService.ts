import { User, UserInput, UserUpdate, AppError } from '@/types';
import { logger } from '@/utils/logger';
import db from '@/config/database';

export class UserService {
  // 创建用户
  async create(userData: UserInput): Promise<User> {
    try {
      const [user] = await db('users')
        .insert({
          id: require('uuid').v4(),
          name: userData.name,
          email: userData.email,
          password: userData.password,
          phone: userData.phone,
          role: userData.role || 'user',
          plan: userData.plan || 'free',
          emailVerified: userData.emailVerified || false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning('*');

      logger.info('用户创建成功', { userId: user.id, email: user.email });

      return this.mapDbUserToUser(user);
    } catch (error) {
      if (error instanceof Error && error.message.includes('duplicate key')) {
        throw new AppError('邮箱已存在', 400);
      }
      logger.error('用户创建失败', { error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('用户创建失败', 500);
    }
  }

  // 根据ID查找用户
  async findById(id: string): Promise<User | null> {
    try {
      const user = await db('users')
        .where({ id })
        .first();

      return user ? this.mapDbUserToUser(user) : null;
    } catch (error) {
      logger.error('查找用户失败', { id, error: error instanceof Error ? error.message : '未知错误' });
      return null;
    }
  }

  // 根据邮箱查找用户
  async findByEmail(email: string): Promise<User | null> {
    try {
      const user = await db('users')
        .where({ email })
        .first();

      return user ? this.mapDbUserToUser(user) : null;
    } catch (error) {
      logger.error('根据邮箱查找用户失败', { email, error: error instanceof Error ? error.message : '未知错误' });
      return null;
    }
  }

  // 根据用户名查找用户
  async findByName(name: string): Promise<User | null> {
    try {
      const user = await db('users')
        .where({ name })
        .first();

      return user ? this.mapDbUserToUser(user) : null;
    } catch (error) {
      logger.error('根据用户名查找用户失败', { name, error: error instanceof Error ? error.message : '未知错误' });
      return null;
    }
  }

  // 更新用户信息
  async update(id: string, updateData: UserUpdate): Promise<User> {
    try {
      const updateFields: any = {
        updatedAt: new Date(),
      };

      if (updateData.name !== undefined) updateFields.name = updateData.name;
      if (updateData.phone !== undefined) updateFields.phone = updateData.phone;
      if (updateData.avatar !== undefined) updateFields.avatar = updateData.avatar;
      if (updateData.plan !== undefined) updateFields.plan = updateData.plan;
      if (updateData.password !== undefined) updateFields.password = updateData.password;
      if (updateData.emailVerified !== undefined) updateFields.emailVerified = updateData.emailVerified;
      if (updateData.lastLoginAt !== undefined) updateFields.lastLoginAt = updateData.lastLoginAt;

      const [user] = await db('users')
        .where({ id })
        .update(updateFields)
        .returning('*');

      if (!user) {
        throw new AppError('用户不存在', 404);
      }

      logger.info('用户信息更新成功', { userId: id, updateData });

      return this.mapDbUserToUser(user);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('用户信息更新失败', { id, updateData, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('用户信息更新失败', 500);
    }
  }

  // 删除用户
  async delete(id: string): Promise<void> {
    try {
      const deletedCount = await db('users')
        .where({ id })
        .del();

      if (deletedCount === 0) {
        throw new AppError('用户不存在', 404);
      }

      logger.info('用户删除成功', { userId: id });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('用户删除失败', { id, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('用户删除失败', 500);
    }
  }

  // 获取用户列表
  async getUsers(options: {
    page?: number;
    limit?: number;
    role?: 'admin' | 'user';
    plan?: 'free' | 'pro';
    search?: string;
  } = {}): Promise<{ users: User[]; total: number; page: number; limit: number; totalPages: number }> {
    try {
      const { page = 1, limit = 10, role, plan, search } = options;
      const offset = (page - 1) * limit;

      let query = db('users').select('*');

      // 添加筛选条件
      if (role) {
        query = query.where('role', role);
      }

      if (plan) {
        query = query.where('plan', plan);
      }

      if (search) {
        query = query.where(function() {
          this.where('name', 'ilike', `%${search}%`)
              .orWhere('email', 'ilike', `%${search}%`);
        });
      }

      // 获取总数
      const totalQuery = query.clone().clearSelect().count('* as count');
      const [{ count }] = await totalQuery;
      const total = parseInt(count as string);

      // 获取用户列表
      const users = await query
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset);

      const totalPages = Math.ceil(total / limit);

      return {
        users: users.map(user => this.mapDbUserToUser(user)),
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error('获取用户列表失败', { options, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('获取用户列表失败', 500);
    }
  }

  // 更新用户角色
  async updateRole(id: string, role: 'admin' | 'user'): Promise<User> {
    try {
      const [user] = await db('users')
        .where({ id })
        .update({
          role,
          updatedAt: new Date(),
        })
        .returning('*');

      if (!user) {
        throw new AppError('用户不存在', 404);
      }

      logger.info('用户角色更新成功', { userId: id, role });

      return this.mapDbUserToUser(user);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('用户角色更新失败', { id, role, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('用户角色更新失败', 500);
    }
  }

  // 更新用户套餐
  async updatePlan(id: string, plan: 'free' | 'pro'): Promise<User> {
    try {
      const [user] = await db('users')
        .where({ id })
        .update({
          plan,
          updatedAt: new Date(),
        })
        .returning('*');

      if (!user) {
        throw new AppError('用户不存在', 404);
      }

      logger.info('用户套餐更新成功', { userId: id, plan });

      return this.mapDbUserToUser(user);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('用户套餐更新失败', { id, plan, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('用户套餐更新失败', 500);
    }
  }

  // 获取用户统计信息
  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    adminUsers: number;
    proUsers: number;
    freeUsers: number;
    newUsersThisMonth: number;
  }> {
    try {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [totalUsers, adminUsers, proUsers, freeUsers, newUsersThisMonth] = await Promise.all([
        db('users').count('* as count').first(),
        db('users').where('role', 'admin').count('* as count').first(),
        db('users').where('plan', 'pro').count('* as count').first(),
        db('users').where('plan', 'free').count('* as count').first(),
        db('users').where('createdAt', '>=', firstDayOfMonth).count('* as count').first(),
      ]);

      const activeUsers = await db('users')
        .where('lastLoginAt', '>=', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // 30天内活跃
        .count('* as count')
        .first();

      return {
        totalUsers: parseInt(totalUsers.count as string),
        activeUsers: parseInt(activeUsers.count as string),
        adminUsers: parseInt(adminUsers.count as string),
        proUsers: parseInt(proUsers.count as string),
        freeUsers: parseInt(freeUsers.count as string),
        newUsersThisMonth: parseInt(newUsersThisMonth.count as string),
      };
    } catch (error) {
      logger.error('获取用户统计信息失败', { error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('获取用户统计信息失败', 500);
    }
  }

  // 将数据库用户对象映射为用户类型
  private mapDbUserToUser(dbUser: any): User {
    return {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      password: dbUser.password,
      role: dbUser.role,
      plan: dbUser.plan,
      phone: dbUser.phone,
      avatar: dbUser.avatar,
      emailVerified: dbUser.emailVerified,
      createdAt: new Date(dbUser.createdAt),
      updatedAt: new Date(dbUser.updatedAt),
      lastLoginAt: dbUser.lastLoginAt ? new Date(dbUser.lastLoginAt) : undefined,
    };
  }
}

export default UserService;