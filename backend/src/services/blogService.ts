import { BlogPost, BlogPostInput, BlogPostUpdate, AppError } from '@/types';
import { logger } from '@/utils/logger';
import db from '@/config/database';

export class BlogService {
  // 获取文章列表
  async getPosts(options: {
    page: number;
    limit: number;
    category?: string;
    author?: string;
    status?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{ posts: BlogPost[]; total: number; page: number; limit: number; totalPages: number }> {
    try {
      const { page, limit, category, author, status = 'published', search, sortBy = 'publishedAt', sortOrder = 'desc' } = options;
      const offset = (page - 1) * limit;

      let query = db('blog_posts')
        .select('*')
        .where('status', status);

      // 添加筛选条件
      if (category) {
        query = query.where('category', category);
      }

      if (author) {
        query = query.where('author', 'like', `%${author}%`);
      }

      if (search) {
        query = query.where(function() {
          this.where('title', 'ilike', `%${search}%`)
              .orWhere('summary', 'ilike', `%${search}%`)
              .orWhere('content', 'ilike', `%${search}%`);
        });
      }

      // 获取总数
      const totalQuery = query.clone().clearSelect().count('* as count');
      const [{ count }] = await totalQuery;
      const total = parseInt(count as string);

      // 获取文章列表
      const posts = await query
        .orderBy(sortBy, sortOrder as 'asc' | 'desc')
        .limit(limit)
        .offset(offset);

      const totalPages = Math.ceil(total / limit);

      return {
        posts: posts.map(post => this.mapDbPostToPost(post)),
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error('获取文章列表失败', { options, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('获取文章列表失败', 500);
    }
  }

  // 根据ID获取文章
  async getPostById(id: string, userId?: string): Promise<BlogPost> {
    try {
      let query = db('blog_posts').where('id', id);

      // 如果不是作者且不是管理员，只能查看已发布的文章
      if (userId) {
        query = query.where(function() {
          this.where('status', 'published')
              .orWhere('authorId', userId);
        });
      } else {
        query = query.where('status', 'published');
      }

      const post = await query.first();

      if (!post) {
        throw new AppError('文章不存在', 404);
      }

      return this.mapDbPostToPost(post);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('获取文章详情失败', { id, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('获取文章详情失败', 500);
    }
  }

  // 创建文章
  async createPost(postData: BlogPostInput & { authorId: string; author: string }): Promise<BlogPost> {
    try {
      const [post] = await db('blog_posts')
        .insert({
          id: require('uuid').v4(),
          title: postData.title,
          summary: postData.summary,
          content: postData.content,
          thumbnail: postData.thumbnail,
          authorId: postData.authorId,
          author: postData.author,
          category: postData.category,
          tags: postData.tags || [],
          requiredPlan: postData.requiredPlan || 'free',
          status: postData.status || 'draft',
          publishedAt: postData.status === 'published' ? new Date() : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning('*');

      logger.info('文章创建成功', { postId: post.id, title: post.title, authorId: post.authorId });

      return this.mapDbPostToPost(post);
    } catch (error) {
      logger.error('文章创建失败', { postData, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('文章创建失败', 500);
    }
  }

  // 更新文章
  async updatePost(id: string, updateData: BlogPostUpdate, userId: string, userRole: string): Promise<BlogPost> {
    try {
      // 检查文章是否存在以及权限
      const existingPost = await this.getPostById(id);

      // 权限检查：只有作者或管理员可以更新文章
      if (existingPost.authorId !== userId && userRole !== 'admin') {
        throw new AppError('无权修改此文章', 403);
      }

      const updateFields: any = {
        updatedAt: new Date(),
      };

      if (updateData.title !== undefined) updateFields.title = updateData.title;
      if (updateData.summary !== undefined) updateFields.summary = updateData.summary;
      if (updateData.content !== undefined) updateFields.content = updateData.content;
      if (updateData.thumbnail !== undefined) updateFields.thumbnail = updateData.thumbnail;
      if (updateData.category !== undefined) updateFields.category = updateData.category;
      if (updateData.tags !== undefined) updateFields.tags = updateData.tags;
      if (updateData.requiredPlan !== undefined) updateFields.requiredPlan = updateData.requiredPlan;

      // 状态更新处理
      if (updateData.status !== undefined) {
        updateFields.status = updateData.status;
        if (updateData.status === 'published' && existingPost.status !== 'published') {
          updateFields.publishedAt = new Date();
        }
      }

      const [post] = await db('blog_posts')
        .where({ id })
        .update(updateFields)
        .returning('*');

      logger.info('文章更新成功', { postId: id, userId, updateData });

      return this.mapDbPostToPost(post);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('文章更新失败', { id, updateData, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('文章更新失败', 500);
    }
  }

  // 删除文章
  async deletePost(id: string, userId: string, userRole: string): Promise<void> {
    try {
      // 检查文章是否存在以及权限
      const existingPost = await this.getPostById(id);

      // 权限检查：只有作者或管理员可以删除文章
      if (existingPost.authorId !== userId && userRole !== 'admin') {
        throw new AppError('无权删除此文章', 403);
      }

      const deletedCount = await db('blog_posts')
        .where({ id })
        .del();

      if (deletedCount === 0) {
        throw new AppError('文章不存在', 404);
      }

      logger.info('文章删除成功', { postId: id, userId });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('文章删除失败', { id, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('文章删除失败', 500);
    }
  }

  // 更新文章状态
  async updatePostStatus(id: string, status: 'draft' | 'published' | 'archived', userId: string, userRole: string): Promise<BlogPost> {
    try {
      // 检查文章是否存在以及权限
      const existingPost = await this.getPostById(id);

      // 权限检查：只有作者或管理员可以更新文章状态
      if (existingPost.authorId !== userId && userRole !== 'admin') {
        throw new AppError('无权修改此文章状态', 403);
      }

      const updateFields: any = {
        status,
        updatedAt: new Date(),
      };

      if (status === 'published' && existingPost.status !== 'published') {
        updateFields.publishedAt = new Date();
      }

      const [post] = await db('blog_posts')
        .where({ id })
        .update(updateFields)
        .returning('*');

      logger.info('文章状态更新成功', { postId: id, status, userId });

      return this.mapDbPostToPost(post);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('文章状态更新失败', { id, status, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('文章状态更新失败', 500);
    }
  }

  // 增加浏览次数
  async incrementViewCount(id: string): Promise<void> {
    try {
      await db('blog_posts')
        .where({ id })
        .increment('viewCount', 1);
    } catch (error) {
      logger.error('增加浏览次数失败', { id, error: error instanceof Error ? error.message : '未知错误' });
      // 不抛出错误，避免影响主要功能
    }
  }

  // 点赞/取消点赞
  async toggleLike(postId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    try {
      const trx = await db.transaction();

      try {
        // 检查用户是否已经点赞
        const existingLike = await trx('post_likes')
          .where({ postId, userId })
          .first();

        if (existingLike) {
          // 取消点赞
          await trx('post_likes')
            .where({ postId, userId })
            .del();

          await trx('blog_posts')
            .where({ id: postId })
            .decrement('likeCount', 1);

          const [post] = await trx('blog_posts')
            .where({ id: postId })
            .select('likeCount');

          await trx.commit();

          return { liked: false, likeCount: post.likeCount };
        } else {
          // 添加点赞
          await trx('post_likes')
            .insert({
              id: require('uuid').v4(),
              postId,
              userId,
              createdAt: new Date(),
            });

          await trx('blog_posts')
            .where({ id: postId })
            .increment('likeCount', 1);

          const [post] = await trx('blog_posts')
            .where({ id: postId })
            .select('likeCount');

          await trx.commit();

          return { liked: true, likeCount: post.likeCount };
        }
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    } catch (error) {
      logger.error('点赞操作失败', { postId, userId, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('点赞操作失败', 500);
    }
  }

  // 获取分类列表
  async getCategories(): Promise<{ category: string; count: number }[]> {
    try {
      const categories = await db('blog_posts')
        .select('category')
        .whereNotNull('category')
        .where('status', 'published')
        .groupBy('category')
        .orderBy('category')
        .count('* as count');

      return categories.map(cat => ({
        category: cat.category,
        count: parseInt(cat.count as string),
      }));
    } catch (error) {
      logger.error('获取分类列表失败', { error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('获取分类列表失败', 500);
    }
  }

  // 获取用户文章列表
  async getUserPosts(userId: string, options: {
    page: number;
    limit: number;
    status?: string;
  }): Promise<{ posts: BlogPost[]; total: number; page: number; limit: number; totalPages: number }> {
    try {
      const { page, limit, status } = options;
      const offset = (page - 1) * limit;

      let query = db('blog_posts')
        .select('*')
        .where('authorId', userId);

      if (status) {
        query = query.where('status', status);
      }

      // 获取总数
      const totalQuery = query.clone().clearSelect().count('* as count');
      const [{ count }] = await totalQuery;
      const total = parseInt(count as string);

      // 获取文章列表
      const posts = await query
        .orderBy('updatedAt', 'desc')
        .limit(limit)
        .offset(offset);

      const totalPages = Math.ceil(total / limit);

      return {
        posts: posts.map(post => this.mapDbPostToPost(post)),
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error('获取用户文章列表失败', { userId, options, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('获取用户文章列表失败', 500);
    }
  }

  // 获取热门文章
  async getTrendingPosts(limit: number, days: number): Promise<BlogPost[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const posts = await db('blog_posts')
        .select('*')
        .where('status', 'published')
        .where('publishedAt', '>=', startDate)
        .orderBy('viewCount', 'desc')
        .orderBy('likeCount', 'desc')
        .limit(limit);

      return posts.map(post => this.mapDbPostToPost(post));
    } catch (error) {
      logger.error('获取热门文章失败', { limit, days, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('获取热门文章失败', 500);
    }
  }

  // 搜索文章
  async searchPosts(query: string, options: {
    page: number;
    limit: number;
  }): Promise<{ posts: BlogPost[]; total: number; page: number; limit: number; totalPages: number }> {
    try {
      const { page, limit } = options;
      const offset = (page - 1) * limit;

      // 使用全文搜索
      const searchQuery = db('blog_posts')
        .select('*')
        .where('status', 'published')
        .where(function() {
          this.where('title', 'ilike', `%${query}%`)
              .orWhere('summary', 'ilike', `%${query}%`)
              .orWhere('content', 'ilike', `%${query}%`);
        });

      // 获取总数
      const totalQuery = searchQuery.clone().clearSelect().count('* as count');
      const [{ count }] = await totalQuery;
      const total = parseInt(count as string);

      // 获取搜索结果
      const posts = await searchQuery
        .orderBy('publishedAt', 'desc')
        .limit(limit)
        .offset(offset);

      const totalPages = Math.ceil(total / limit);

      return {
        posts: posts.map(post => this.mapDbPostToPost(post)),
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error('搜索文章失败', { query, options, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('搜索文章失败', 500);
    }
  }

  // 将数据库文章对象映射为文章类型
  private mapDbPostToPost(dbPost: any): BlogPost {
    return {
      id: dbPost.id,
      title: dbPost.title,
      summary: dbPost.summary,
      content: dbPost.content,
      thumbnail: dbPost.thumbnail,
      author: dbPost.author,
      authorId: dbPost.authorId,
      requiredPlan: dbPost.requiredPlan,
      category: dbPost.category,
      tags: Array.isArray(dbPost.tags) ? dbPost.tags : [],
      viewCount: dbPost.viewCount || 0,
      likeCount: dbPost.likeCount || 0,
      status: dbPost.status,
      publishedAt: dbPost.publishedAt ? new Date(dbPost.publishedAt) : undefined,
      createdAt: new Date(dbPost.createdAt),
      updatedAt: new Date(dbPost.updatedAt),
    };
  }
}

export default BlogService;