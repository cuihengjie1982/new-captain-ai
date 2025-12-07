import { UserAnalytics, AppError } from '@/types';
import { logger } from '@/utils/logger';
import db from '@/config/database';

export class AnalyticsService {
  // 获取用户学习分析数据
  async getUserAnalytics(userId: string, options: { days?: number } = {}): Promise<UserAnalytics> {
    try {
      const { days = 30 } = options;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // 获取基础统计数据
      const [
        totalWatchTimeResult,
        totalReadArticlesResult,
        totalNotesResult,
        totalCommentsResult,
        lastActiveDateResult,
        weeklyActivityResult,
        favoriteCategoriesResult,
        learningStreakResult,
      ] = await Promise.all([
        // 总观看时长
        db('user_history')
          .where({ userId, actionType: 'video_watch' })
          .where('createdAt', '>=', startDate)
          .sum('duration as totalDuration')
          .first(),

        // 总阅读文章数
        db('user_history')
          .where({ userId, actionType: 'article_read' })
          .where('createdAt', '>=', startDate)
          .count('* as count')
          .first(),

        // 总笔记数
        db('user_notes')
          .where({ userId })
          .where('createdAt', '>=', startDate)
          .count('* as count')
          .first(),

        // 总评论数
        db('user_history')
          .where({ userId, actionType: 'comment_post' })
          .where('createdAt', '>=', startDate)
          .count('* as count')
          .first(),

        // 最后活跃日期
        db('user_history')
          .where({ userId })
          .max('createdAt as lastActive')
          .first(),

        // 周进度数据
        this.getWeeklyProgress(userId, days),

        // 喜爱分类（基于文章阅读）
        this.getFavoriteCategories(userId, days),

        // 学习连续天数
        this.getLearningStreak(userId),
      ]);

      const analytics: UserAnalytics = {
        userId,
        totalWatchTime: parseInt(totalWatchTimeResult.totalDuration || '0'),
        totalReadArticles: parseInt(totalReadArticlesResult.count as string),
        totalNotes: parseInt(totalNotesResult.count as string),
        totalComments: parseInt(totalCommentsResult.count as string),
        learningStreak: learningStreakResult,
        lastActiveDate: new Date(lastActiveDateResult.lastActive || new Date()),
        favoriteCategories: favoriteCategoriesResult,
        weeklyProgress: weeklyActivityResult,
      };

      return analytics;
    } catch (error) {
      logger.error('获取用户分析数据失败', {
        userId,
        options,
        error: error instanceof Error ? error.message : '未知错误',
      });
      throw new AppError('获取用户分析数据失败', 500);
    }
  }

  // 获取用户进度信息
  async getUserProgress(userId: string): Promise<{
    level: number;
    experience: number;
    nextLevelExperience: number;
    achievements: string[];
    completedCourses: number;
    inProgressCourses: number;
    skillProgress: Record<string, number>;
  }> {
    try {
      // 这里可以扩展为更复杂的进度计算系统
      // 当前基于学习时长和完成度来计算

      const [experienceResult, noteCountResult, commentCountResult] = await Promise.all([
        // 基础经验值（观看时长 + 阅读数量）
        db.raw(`
          SELECT COALESCE(
            (SELECT SUM(duration) FROM user_history WHERE user_id = ? AND action_type = 'video_watch'),
            0
          ) * 60 + -- 观看时长转换为秒，再乘以60
          (SELECT COUNT(*) FROM user_history WHERE user_id = ? AND action_type = 'article_read') * 100 + -- 每篇文章100经验
          (SELECT COUNT(*) FROM user_notes WHERE user_id = ?) * 50 + -- 每个笔记50经验
          (SELECT COUNT(*) FROM user_history WHERE user_id = ? AND action_type = 'comment_post') * 30 -- 每个评论30经验
          as experience
        `, [userId, userId, userId, userId]),

        db('user_notes')
          .where({ userId })
          .count('* as count')
          .first(),

        db('user_history')
          .where({ userId, actionType: 'comment_post' })
          .count('* as count')
          .first(),
      ]);

      const experience = parseInt(experienceResult.experience || '0');
      const noteCount = parseInt(noteCountResult.count as string);
      const commentCount = parseInt(commentCountResult.count as string);

      // 计算等级（每1000经验升一级）
      const level = Math.floor(experience / 1000) + 1;
      const nextLevelExperience = level * 1000;

      // 简单的成就系统
      const achievements: string[] = [];
      if (experience >= 100) achievements.push('初学者');
      if (experience >= 500) achievements.push('积极学习者');
      if (experience >= 1000) achievements.push('学习达人');
      if (experience >= 5000) achievements.push('知识专家');
      if (noteCount >= 10) achievements.push('笔记达人');
      if (commentCount >= 20) achievements.push('互动达人');

      // 技能进度（基于不同类型的学习活动）
      const skillProgress: Record<string, number> = {
        '阅读理解': Math.min(100, (experience / 2000) * 100),
        '视频学习': Math.min(100, (parseInt(experienceResult.experience || '0') / 10000) * 100),
        '笔记整理': Math.min(100, (noteCount / 50) * 100),
        '互动交流': Math.min(100, (commentCount / 100) * 100),
      };

      return {
        level,
        experience,
        nextLevelExperience,
        achievements,
        completedCourses: 0, // 待实现课程系统
        inProgressCourses: 0, // 待实现课程系统
        skillProgress,
      };
    } catch (error) {
      logger.error('获取用户进度失败', {
        userId,
        error: error instanceof Error ? error.message : '未知错误',
      });
      throw new AppError('获取用户进度失败', 500);
    }
  }

  // 获取周进度数据
  private async getWeeklyProgress(userId: string, days: number): Promise<Array<{
    week: string;
    watchTime: number;
    articlesRead: number;
    notesCreated: number;
  }>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // 按周统计数据
      const weeklyData = await db('user_history')
        .where({ userId })
        .where('createdAt', '>=', startDate)
        .select(db.raw(`
          DATE_TRUNC('week', created_at) as week,
          SUM(CASE WHEN action_type = 'video_watch' THEN duration ELSE 0 END) as watchTime,
          SUM(CASE WHEN action_type = 'article_read' THEN 1 ELSE 0 END) as articlesRead
        `))
        .groupBy(db.raw('DATE_TRUNC(\'week\', created_at)'))
        .orderBy('week', 'ASC');

      // 获取每周笔记数
      const weeklyNotes = await db('user_notes')
        .where({ userId })
        .where('createdAt', '>=', startDate)
        .select(db.raw(`
          DATE_TRUNC('week', created_at) as week,
          COUNT(*) as notesCount
        `))
        .groupBy(db.raw('DATE_TRUNC(\'week\', created_at)'));

      // 合并数据
      const weeklyProgress = weeklyData.map((data: any) => {
        const weekData = weeklyNotes.find((note: any) => note.week === data.week);
        return {
          week: data.week.toISOString().split('T')[0],
          watchTime: parseInt(data.watchTime || '0'),
          articlesRead: parseInt(data.articlesRead || '0'),
          notesCreated: weekData ? parseInt(weekData.notesCount) : 0,
        };
      });

      return weeklyProgress;
    } catch (error) {
      logger.error('获取周进度数据失败', { userId, days, error: error instanceof Error ? error.message : '未知错误' });
      return [];
    }
  }

  // 获取用户喜欢的分类
  private async getFavoriteCategories(userId: string, days: number): Promise<string[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // 基于阅读文章的分类统计
      const categoryStats = await db('user_history')
        .join('blog_posts', 'user_history.item_id', 'blog_posts.id')
        .where({
          'user_history.userId': userId,
          'user_history.actionType': 'article_read',
          'user_history.itemType': 'article',
        })
        .where('user_history.createdAt', '>=', startDate)
        .whereNotNull('blog_posts.category')
        .select('blog_posts.category')
        .select(db.raw('COUNT(*) as count'))
        .groupBy('blog_posts.category')
        .orderBy('count', 'DESC')
        .limit(5);

      return categoryStats.map((stat: any) => stat.category);
    } catch (error) {
      logger.error('获取用户喜欢分类失败', { userId, days, error: error instanceof Error ? error.message : '未知错误' });
      return [];
    }
  }

  // 获取学习连续天数
  private async getLearningStreak(userId: string): Promise<number> {
    try {
      // 获取最近的学习记录
      const recentActivities = await db('user_history')
        .where({ userId })
        .orderBy('createdAt', 'DESC')
        .limit(30);

      if (recentActivities.length === 0) {
        return 0;
      }

      let streak = 1;
      let currentDate = new Date(recentActivities[0].createdAt);
      currentDate.setHours(0, 0, 0, 0);

      for (let i = 1; i < recentActivities.length; i++) {
        const activityDate = new Date(recentActivities[i].createdAt);
        activityDate.setHours(0, 0, 0, 0);

        const daysDiff = Math.floor((currentDate.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff === 1) {
          streak++;
          currentDate = activityDate;
        } else if (daysDiff > 1) {
          break;
        }
      }

      return streak;
    } catch (error) {
      logger.error('获取学习连续天数失败', { userId, error: error instanceof Error ? error.message : '未知错误' });
      return 0;
    }
  }

  // 获取系统级别的分析数据（管理员用）
  async getSystemAnalytics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalArticles: number;
    totalVideos: number;
    totalComments: number;
    userGrowth: Array<{ date: string; newUsers: number; activeUsers: number }>;
    contentStats: {
      totalViews: number;
      totalLikes: number;
      topArticles: Array<{ id: string; title: string; views: number; likes: number }>;
    };
  }> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);

      const [
        totalUsersResult,
        activeUsersResult,
        totalArticlesResult,
        totalCommentsResult,
        userGrowthResult,
        contentStatsResult,
      ] = await Promise.all([
        // 总用户数
        db('users').count('* as count').first(),

        // 活跃用户数（30天内有活动）
        db('users')
          .where('lastLoginAt', '>=', thirtyDaysAgo)
          .count('* as count')
          .first(),

        // 总文章数
        db('blog_posts')
          .where({ status: 'published' })
          .count('* as count')
          .first(),

        // 总评论数
        db('comments')
          .where({ status: 'active' })
          .count('* as count')
          .first(),

        // 用户增长数据（最近30天）
        db('users')
          .select(db.raw('DATE(created_at) as date'))
          .select(db.raw('COUNT(*) as newUsers'))
          .where('createdAt', '>=', thirtyDaysAgo)
          .groupBy(db.raw('DATE(created_at)'))
          .orderBy('date', 'ASC'),

        // 内容统计
        db('blog_posts')
          .where({ status: 'published' })
          .select('id', 'title', 'viewCount', 'likeCount')
          .orderBy('viewCount', 'DESC')
          .limit(10),
      ]);

      const activeUsers = parseInt(activeUsersResult.count as string);

      return {
        totalUsers: parseInt(totalUsersResult.count as string),
        activeUsers,
        totalArticles: parseInt(totalArticlesResult.count as string),
        totalVideos: 0, // 待实现视频系统
        totalComments: parseInt(totalCommentsResult.count as string),
        userGrowth: userGrowthResult.map((row: any) => ({
          date: row.date,
          newUsers: parseInt(row.newUsers),
          activeUsers: 0, // 需要更复杂的查询来计算每日活跃用户
        })),
        contentStats: {
          totalViews: contentStatsResult.reduce((sum: number, article: any) => sum + (article.viewCount || 0), 0),
          totalLikes: contentStatsResult.reduce((sum: number, article: any) => sum + (article.likeCount || 0), 0),
          topArticles: contentStatsResult.map((article: any) => ({
            id: article.id,
            title: article.title,
            views: article.viewCount || 0,
            likes: article.likeCount || 0,
          })),
        },
      };
    } catch (error) {
      logger.error('获取系统分析数据失败', { error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('获取系统分析数据失败', 500);
    }
  }
}

export default AnalyticsService;