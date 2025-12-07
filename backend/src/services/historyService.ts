import { UserHistory, AppError } from '@/types';
import { logger } from '@/utils/logger';
import db from '@/config/database';

export interface UserHistoryAction {
  actionType: 'video_watch' | 'article_read' | 'note_create' | 'comment_post';
  itemId: string;
  itemType: 'video' | 'article' | 'note' | 'comment';
  duration?: number;
  progress?: number;
  metadata?: Record<string, any>;
}

export class HistoryService {
  // 记录用户行为
  async recordUserAction(userId: string, actionData: UserHistoryAction): Promise<UserHistory> {
    try {
      const [history] = await db('user_history')
        .insert({
          id: require('uuid').v4(),
          userId,
          actionType: actionData.actionType,
          itemId: actionData.itemId,
          itemType: actionData.itemType,
          duration: actionData.duration,
          progress: actionData.progress,
          metadata: actionData.metadata ? JSON.stringify(actionData.metadata) : null,
          createdAt: new Date(),
        })
        .returning('*');

      logger.info('用户行为记录成功', {
        userId,
        actionType: actionData.actionType,
        itemId: actionData.itemId,
        itemType: actionData.itemType,
      });

      return this.mapDbHistoryToHistory(history);
    } catch (error) {
      logger.error('用户行为记录失败', {
        userId,
        actionData,
        error: error instanceof Error ? error.message : '未知错误',
      });
      throw new AppError('用户行为记录失败', 500);
    }
  }

  // 获取用户历史记录
  async getUserHistory(userId: string, options: {
    page: number;
    limit: number;
    actionType?: 'video_watch' | 'article_read' | 'note_create' | 'comment_post';
    itemType?: 'video' | 'article' | 'note' | 'comment';
    days?: number;
  }): Promise<{ history: UserHistory[]; total: number; page: number; limit: number; totalPages: number }> {
    try {
      const { page, limit, actionType, itemType, days } = options;
      const offset = (page - 1) * limit;

      let query = db('user_history')
        .select('*')
        .where({ userId });

      // 添加筛选条件
      if (actionType) {
        query = query.where('actionType', actionType);
      }

      if (itemType) {
        query = query.where('itemType', itemType);
      }

      // 添加时间范围筛选
      if (days) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        query = query.where('createdAt', '>=', startDate);
      }

      // 获取总数
      const totalQuery = query.clone().clearSelect().count('* as count');
      const [{ count }] = await totalQuery;
      const total = parseInt(count as string);

      // 获取历史记录列表
      const history = await query
        .orderBy('createdAt', 'DESC')
        .limit(limit)
        .offset(offset);

      const totalPages = Math.ceil(total / limit);

      return {
        history: history.map(h => this.mapDbHistoryToHistory(h)),
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error('获取用户历史记录失败', {
        userId,
        options,
        error: error instanceof Error ? error.message : '未知错误',
      });
      throw new AppError('获取用户历史记录失败', 500);
    }
  }

  // 获取用户观看历史（视频）
  async getVideoHistory(userId: string, options: {
    page?: number;
    limit?: number;
    days?: number;
  } = {}): Promise<{ history: UserHistory[]; total: number; totalPages: number }> {
    const result = await this.getUserHistory(userId, {
      page: options.page || 1,
      limit: options.limit || 10,
      actionType: 'video_watch',
      itemType: 'video',
      days: options.days || 30,
    });

    return {
      history: result.history,
      total: result.total,
      totalPages: result.totalPages,
    };
  }

  // 获取用户阅读历史（文章）
  async getArticleHistory(userId: string, options: {
    page?: number;
    limit?: number;
    days?: number;
  } = {}): Promise<{ history: UserHistory[]; total: number; totalPages: number }> {
    const result = await this.getUserHistory(userId, {
      page: options.page || 1,
      limit: options.limit || 10,
      actionType: 'article_read',
      itemType: 'article',
      days: options.days || 30,
    });

    return {
      history: result.history,
      total: result.total,
      totalPages: result.totalPages,
    };
  }

  // 获取特定项目的历史记录
  async getItemHistory(userId: string, itemId: string, itemType: string): Promise<UserHistory[]> {
    try {
      const history = await db('user_history')
        .select('*')
        .where({ userId, itemId, itemType })
        .orderBy('createdAt', 'DESC');

      return history.map(h => this.mapDbHistoryToHistory(h));
    } catch (error) {
      logger.error('获取项目历史记录失败', {
        userId,
        itemId,
        itemType,
        error: error instanceof Error ? error.message : '未知错误',
      });
      throw new AppError('获取项目历史记录失败', 500);
    }
  }

  // 更新观看进度
  async updateProgress(userId: string, itemId: string, itemType: string, progress: number): Promise<void> {
    try {
      await db('user_history')
        .where({ userId, itemId, itemType })
        .orderBy('createdAt', 'DESC')
        .limit(1)
        .update({
          progress,
          createdAt: new Date(),
        });

      logger.info('观看进度更新成功', { userId, itemId, itemType, progress });
    } catch (error) {
      logger.error('观看进度更新失败', {
        userId,
        itemId,
        itemType,
        progress,
        error: error instanceof Error ? error.message : '未知错误',
      });
      throw new AppError('观看进度更新失败', 500);
    }
  }

  // 获取用户统计数据
  async getUserStats(userId: string, options: { days?: number } = {}): Promise<{
    totalWatchTime: number;
    totalReadArticles: number;
    totalNotes: number;
    totalComments: number;
    activeDays: number;
    recentActivity: UserHistory[];
  }> {
    try {
      const { days = 30 } = options;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // 获取各种行为的统计数据
      const [watchStats, readStats, noteStats, commentStats, activeDaysStats, recentActivity] = await Promise.all([
        db('user_history')
          .where({ userId, actionType: 'video_watch' })
          .where('createdAt', '>=', startDate)
          .sum('duration as totalDuration')
          .first(),

        db('user_history')
          .where({ userId, actionType: 'article_read' })
          .where('createdAt', '>=', startDate)
          .count('* as count')
          .first(),

        db('user_history')
          .where({ userId, actionType: 'note_create' })
          .where('createdAt', '>=', startDate)
          .count('* as count')
          .first(),

        db('user_history')
          .where({ userId, actionType: 'comment_post' })
          .where('createdAt', '>=', startDate)
          .count('* as count')
          .first(),

        db('user_history')
          .where({ userId })
          .where('createdAt', '>=', startDate)
          .select(db.raw('DATE(created_at) as date'))
          .distinct()
          .count('* as count')
          .first(),

        db('user_history')
          .where({ userId })
          .orderBy('createdAt', 'DESC')
          .limit(10),
      ]);

      const stats = {
        totalWatchTime: parseInt(watchStats.totalDuration || '0'),
        totalReadArticles: parseInt(readStats.count as string),
        totalNotes: parseInt(noteStats.count as string),
        totalComments: parseInt(commentStats.count as string),
        activeDays: parseInt(activeDaysStats.count as string),
        recentActivity: recentActivity.map(h => this.mapDbHistoryToHistory(h)),
      };

      return stats;
    } catch (error) {
      logger.error('获取用户统计数据失败', {
        userId,
        options,
        error: error instanceof Error ? error.message : '未知错误',
      });
      throw new AppError('获取用户统计数据失败', 500);
    }
  }

  // 获取学习热点时间段
  async getLearningPatterns(userId: string): Promise<{
    mostActiveHour: number;
    mostActiveDay: string;
    weeklyPattern: { day: string; count: number }[];
    hourlyPattern: { hour: number; count: number }[];
  }> {
    try {
      // 获取过去30天的数据
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const [hourlyStats, weeklyStats] = await Promise.all([
        db('user_history')
          .where({ userId })
          .where('createdAt', '>=', startDate)
          .select(db.raw('EXTRACT(HOUR FROM created_at) as hour'))
          .select(db.raw('COUNT(*) as count'))
          .groupBy(db.raw('EXTRACT(HOUR FROM created_at)'))
          .orderBy(db.raw('EXTRACT(HOUR FROM created_at)')),

        db('user_history')
          .where({ userId })
          .where('createdAt', '>=', startDate)
          .select(db.raw('TO_CHAR(created_at, \'Day\') as day'))
          .select(db.raw('COUNT(*) as count'))
          .groupBy(db.raw('TO_CHAR(created_at, \'Day\')'))
          .orderBy('count', 'DESC'),
      ]);

      // 找出最活跃的小时
      let mostActiveHour = 14; // 默认下午2点
      let maxHourCount = 0;
      hourlyStats.forEach((stat: any) => {
        const count = parseInt(stat.count);
        if (count > maxHourCount) {
          maxHourCount = count;
          mostActiveHour = Math.floor(stat.hour);
        }
      });

      const weeklyPattern = weeklyStats.map((stat: any) => ({
        day: stat.day,
        count: parseInt(stat.count),
      }));

      const hourlyPattern = Array.from({ length: 24 }, (_, i) => {
        const hourStat = hourlyStats.find((stat: any) => Math.floor(stat.hour) === i);
        return {
          hour: i,
          count: hourStat ? parseInt(hourStat.count) : 0,
        };
      });

      return {
        mostActiveHour,
        mostActiveDay: weeklyPattern[0]?.day || 'Monday',
        weeklyPattern,
        hourlyPattern,
      };
    } catch (error) {
      logger.error('获取学习模式失败', {
        userId,
        error: error instanceof Error ? error.message : '未知错误',
      });
      throw new AppError('获取学习模式失败', 500);
    }
  }

  // 删除历史记录
  async deleteHistory(userId: string, historyId: string): Promise<void> {
    try {
      const deletedCount = await db('user_history')
        .where({ userId, id: historyId })
        .del();

      if (deletedCount === 0) {
        throw new AppError('历史记录不存在', 404);
      }

      logger.info('历史记录删除成功', { userId, historyId });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('历史记录删除失败', {
        userId,
        historyId,
        error: error instanceof Error ? error.message : '未知错误',
      });
      throw new AppError('历史记录删除失败', 500);
    }
  }

  // 清空用户历史记录
  async clearHistory(userId: string, options: {
    olderThan?: number; // 天数
    actionType?: string;
  } = {}): Promise<number> {
    try {
      let query = db('user_history').where({ userId });

      if (options.olderThan) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - options.olderThan);
        query = query.where('createdAt', '<', cutoffDate);
      }

      if (options.actionType) {
        query = query.where('actionType', options.actionType);
      }

      const deletedCount = await query.del();

      logger.info('用户历史记录清空成功', {
        userId,
        deletedCount,
        options,
      });

      return deletedCount;
    } catch (error) {
      logger.error('清空用户历史记录失败', {
        userId,
        options,
        error: error instanceof Error ? error.message : '未知错误',
      });
      throw new AppError('清空用户历史记录失败', 500);
    }
  }

  // 将数据库历史对象映射为历史类型
  private mapDbHistoryToHistory(dbHistory: any): UserHistory {
    return {
      id: dbHistory.id,
      userId: dbHistory.userId,
      actionType: dbHistory.actionType,
      itemId: dbHistory.itemId,
      itemType: dbHistory.itemType,
      duration: dbHistory.duration,
      progress: dbHistory.progress,
      metadata: dbHistory.metadata ? JSON.parse(dbHistory.metadata) : undefined,
      createdAt: new Date(dbHistory.createdAt),
    };
  }
}

export default HistoryService;