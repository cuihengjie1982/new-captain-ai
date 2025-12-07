import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import {
  CommunityPost,
  CommunityReply,
  CommunityCategory,
  CommunityLike,
  CommunityRead,
  CommunityStats,
  CreatePostRequest,
  UpdatePostRequest,
  CreateReplyRequest,
  UpdateReplyRequest,
  GetPostsQuery,
  GetRepliesQuery,
  PaginatedResponse,
  ApiResponse
} from '../types/community';
import { db } from '../config/database';
import { logger } from '../utils/logger';

export class CommunityService {
  private db: Knex;

  constructor() {
    this.db = db;
  }

  // ==================== 分类管理 ====================

  async getCategories(): Promise<ApiResponse<CommunityCategory[]>> {
    try {
      const categories = await this.db('community_categories')
        .where('status', 'active')
        .orderBy('postCount', 'desc');

      return {
        success: true,
        data: categories
      };
    } catch (error) {
      logger.error('Error getting community categories:', error);
      return {
        success: false,
        error: 'Failed to get categories'
      };
    }
  }

  async createCategory(categoryData: Omit<CommunityCategory, 'id' | 'postCount' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<CommunityCategory>> {
    try {
      const [category] = await this.db('community_categories')
        .insert(categoryData)
        .returning('*');

      return {
        success: true,
        data: category
      };
    } catch (error) {
      logger.error('Error creating community category:', error);
      return {
        success: false,
        error: 'Failed to create category'
      };
    }
  }

  // ==================== 帖子管理 ====================

  async getPosts(query: GetPostsQuery = {}, userId?: string): Promise<ApiResponse<PaginatedResponse<CommunityPost>>> {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        search,
        tags,
        sortBy = 'latest',
        authorId,
        isPinned
      } = query;

      let qb = this.db('community_posts')
        .select([
          'community_posts.*',
          'users.name as authorName',
          'users.avatar as authorAvatar',
          'users.role as authorRole'
        ])
        .leftJoin('users', 'community_posts.authorId', 'users.id')
        .where('community_posts.status', 'published');

      // 分类筛选
      if (category) {
        qb = qb.where('community_posts.categoryName', category);
      }

      // 搜索筛选
      if (search) {
        qb = qb.where(function() {
          this.where('community_posts.title', 'ilike', `%${search}%`)
              .orWhere('community_posts.content', 'ilike', `%${search}%`);
        });
      }

      // 标签筛选
      if (tags && tags.length > 0) {
        qb = qb.where(function() {
          tags.forEach(tag => {
            this.orWhereRaw('? = ANY(community_posts.tags)', [tag]);
          });
        });
      }

      // 作者筛选
      if (authorId) {
        qb = qb.where('community_posts.authorId', authorId);
      }

      // 置顶筛选
      if (isPinned !== undefined) {
        qb = qb.where('community_posts.isPinned', isPinned);
      }

      // 排序
      switch (sortBy) {
        case 'popular':
          qb = qb.orderBy('community_posts.likeCount', 'desc')
                  .orderBy('community_posts.replyCount', 'desc')
                  .orderBy('community_posts.createdAt', 'desc');
          break;
        case 'mostReplies':
          qb = qb.orderBy('community_posts.replyCount', 'desc')
                  .orderBy('community_posts.createdAt', 'desc');
          break;
        case 'mostViews':
          qb = qb.orderBy('community_posts.viewCount', 'desc')
                  .orderBy('community_posts.createdAt', 'desc');
          break;
        case 'latest':
        default:
          qb = qb.orderBy('community_posts.isPinned', 'desc')
                  .orderBy('community_posts.createdAt', 'desc');
          break;
      }

      // 计算总数
      const countQb = qb.clone().clearSelect().clearOrder().count('* as total');
      const [{ total }] = await countQb;

      // 分页
      const offset = (page - 1) * limit;
      const posts = await qb.limit(limit).offset(offset);

      // 如果用户已登录，检查点赞状态
      if (userId && posts.length > 0) {
        const postIds = posts.map(post => post.id);
        const likes = await this.db('community_likes')
          .where('userId', userId)
          .where('targetType', 'post')
          .whereIn('targetId', postIds);

        const likedPostIds = new Set(likes.map(like => like.targetId));
        posts.forEach(post => {
          post.isLiked = likedPostIds.has(post.id);
        });
      }

      return {
        success: true,
        data: {
          data: posts,
          pagination: {
            page,
            limit,
            total: parseInt(total),
            totalPages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1
          }
        }
      };
    } catch (error) {
      logger.error('Error getting community posts:', error);
      return {
        success: false,
        error: 'Failed to get posts'
      };
    }
  }

  async getPostById(id: string, userId?: string): Promise<ApiResponse<CommunityPost>> {
    try {
      let qb = this.db('community_posts')
        .select([
          'community_posts.*',
          'users.name as authorName',
          'users.avatar as authorAvatar',
          'users.role as authorRole'
        ])
        .leftJoin('users', 'community_posts.authorId', 'users.id')
        .where('community_posts.id', id)
        .where('community_posts.status', 'published');

      const [post] = await qb;

      if (!post) {
        return {
          success: false,
          error: 'Post not found'
        };
      }

      // 检查用户点赞状态
      if (userId) {
        const [like] = await this.db('community_likes')
          .where('userId', userId)
          .where('targetType', 'post')
          .where('targetId', id);

        post.isLiked = !!like;
      }

      // 记录阅读
      if (userId) {
        await this.recordRead(userId, id);
        // 增加浏览量
        await this.incrementViewCount(id);
      }

      return {
        success: true,
        data: post
      };
    } catch (error) {
      logger.error('Error getting community post:', error);
      return {
        success: false,
        error: 'Failed to get post'
      };
    }
  }

  async createPost(postData: CreatePostRequest, authorId: string): Promise<ApiResponse<CommunityPost>> {
    try {
      // 获取分类信息
      const [category] = await this.db('community_categories')
        .where('id', postData.categoryId)
        .where('status', 'active');

      if (!category) {
        return {
          success: false,
          error: 'Invalid category'
        };
      }

      // 获取用户信息
      const [user] = await this.db('users')
        .where('id', authorId)
        .select(['name', 'avatar', 'role']);

      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      const post = {
        id: uuidv4(),
        ...postData,
        authorId,
        authorName: user.name,
        authorAvatar: user.avatar,
        authorRole: user.role,
        categoryName: category.name,
        tags: postData.tags || [],
        requiredPlan: postData.requiredPlan || 'free',
        status: 'published' as const
      };

      const [createdPost] = await this.db('community_posts')
        .insert(post)
        .returning('*');

      // 更新分类的帖子数量
      await this.db('community_categories')
        .where('id', postData.categoryId)
        .increment('postCount', 1);

      return {
        success: true,
        data: createdPost
      };
    } catch (error) {
      logger.error('Error creating community post:', error);
      return {
        success: false,
        error: 'Failed to create post'
      };
    }
  }

  async updatePost(id: string, updateData: UpdatePostRequest, userId: string, isAdmin = false): Promise<ApiResponse<CommunityPost>> {
    try {
      // 获取帖子信息
      const [post] = await this.db('community_posts')
        .where('id', id);

      if (!post) {
        return {
          success: false,
          error: 'Post not found'
        };
      }

      // 检查权限
      if (!isAdmin && post.authorId !== userId) {
        return {
          success: false,
          error: 'Permission denied'
        };
      }

      // 如果更新分类，需要更新分类统计
      if (updateData.categoryId && updateData.categoryId !== post.categoryId) {
        // 减少原分类的帖子数量
        await this.db('community_categories')
          .where('id', post.categoryId)
          .decrement('postCount', 1);

        // 增加新分类的帖子数量
        const [newCategory] = await this.db('community_categories')
          .where('id', updateData.categoryId);

        if (newCategory) {
          updateData.categoryName = newCategory.name;
          await this.db('community_categories')
            .where('id', updateData.categoryId)
            .increment('postCount', 1);
        }
      }

      const [updatedPost] = await this.db('community_posts')
        .where('id', id)
        .update({
          ...updateData,
          updatedAt: new Date()
        })
        .returning('*');

      return {
        success: true,
        data: updatedPost
      };
    } catch (error) {
      logger.error('Error updating community post:', error);
      return {
        success: false,
        error: 'Failed to update post'
      };
    }
  }

  async deletePost(id: string, userId: string, isAdmin = false): Promise<ApiResponse> {
    try {
      // 获取帖子信息
      const [post] = await this.db('community_posts')
        .where('id', id);

      if (!post) {
        return {
          success: false,
          error: 'Post not found'
        };
      }

      // 检查权限
      if (!isAdmin && post.authorId !== userId) {
        return {
          success: false,
          error: 'Permission denied'
        };
      }

      // 软删除
      await this.db('community_posts')
        .where('id', id)
        .update({
          status: 'deleted',
          updatedAt: new Date()
        });

      // 删除相关的点赞和阅读记录
      await this.db('community_likes')
        .where('targetId', id)
        .where('targetType', 'post')
        .del();

      await this.db('community_reads')
        .where('postId', id)
        .del();

      // 更新分类的帖子数量
      await this.db('community_categories')
        .where('id', post.categoryId)
        .decrement('postCount', 1);

      return {
        success: true,
        message: 'Post deleted successfully'
      };
    } catch (error) {
      logger.error('Error deleting community post:', error);
      return {
        success: false,
        error: 'Failed to delete post'
      };
    }
  }

  // ==================== 回复管理 ====================

  async getReplies(postId: string, query: GetRepliesQuery = {}, userId?: string): Promise<ApiResponse<PaginatedResponse<CommunityReply>>> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'latest',
        parentId
      } = query;

      let qb = this.db('community_replies')
        .select([
          'community_replies.*',
          'users.name as authorName',
          'users.avatar as authorAvatar',
          'users.role as authorRole'
        ])
        .leftJoin('users', 'community_replies.authorId', 'users.id')
        .where('community_replies.postId', postId)
        .where('community_replies.status', 'published');

      // 父回复筛选
      if (parentId) {
        qb = qb.where('community_replies.parentId', parentId);
      } else {
        // 如果没有指定parentId，获取顶级回复
        qb = qb.whereNull('community_replies.parentId');
      }

      // 排序
      switch (sortBy) {
        case 'oldest':
          qb = qb.orderBy('community_replies.createdAt', 'asc');
          break;
        case 'popular':
          qb = qb.orderBy('community_replies.likeCount', 'desc')
                  .orderBy('community_replies.createdAt', 'desc');
          break;
        case 'latest':
        default:
          qb = qb.orderBy('community_replies.createdAt', 'desc');
          break;
      }

      // 计算总数
      const countQb = qb.clone().clearSelect().clearOrder().count('* as total');
      const [{ total }] = await countQb;

      // 分页
      const offset = (page - 1) * limit;
      const replies = await qb.limit(limit).offset(offset);

      // 如果用户已登录，检查点赞状态
      if (userId && replies.length > 0) {
        const replyIds = replies.map(reply => reply.id);
        const likes = await this.db('community_likes')
          .where('userId', userId)
          .where('targetType', 'reply')
          .whereIn('targetId', replyIds);

        const likedReplyIds = new Set(likes.map(like => like.targetId));
        replies.forEach(reply => {
          reply.isLiked = likedReplyIds.has(reply.id);
        });
      }

      return {
        success: true,
        data: {
          data: replies,
          pagination: {
            page,
            limit,
            total: parseInt(total),
            totalPages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1
          }
        }
      };
    } catch (error) {
      logger.error('Error getting community replies:', error);
      return {
        success: false,
        error: 'Failed to get replies'
      };
    }
  }

  async createReply(replyData: CreateReplyRequest, postId: string, authorId: string): Promise<ApiResponse<CommunityReply>> {
    try {
      // 检查帖子是否存在
      const [post] = await this.db('community_posts')
        .where('id', postId)
        .where('status', 'published');

      if (!post) {
        return {
          success: false,
          error: 'Post not found'
        };
      }

      // 检查帖子是否被锁定
      if (post.isLocked) {
        return {
          success: false,
          error: 'Post is locked for replies'
        };
      }

      // 获取用户信息
      const [user] = await this.db('users')
        .where('id', authorId)
        .select(['name', 'avatar', 'role']);

      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // 检查父回复是否存在（如果提供了parentId）
      let parentReply = null;
      if (replyData.parentId) {
        [parentReply] = await this.db('community_replies')
          .where('id', replyData.parentId)
          .where('postId', postId)
          .where('status', 'published');

        if (!parentReply) {
          return {
            success: false,
            error: 'Parent reply not found'
          };
        }
      }

      const reply = {
        id: uuidv4(),
        postId,
        ...replyData,
        authorId,
        authorName: user.name,
        authorAvatar: user.avatar,
        authorRole: user.role,
        isAuthor: post.authorId === authorId
      };

      const [createdReply] = await this.db('community_replies')
        .insert(reply)
        .returning('*');

      // 更新帖子的回复数量和最后回复时间
      await this.db('community_posts')
        .where('id', postId)
        .increment('replyCount', 1)
        .update({
          lastReplyAt: new Date(),
          updatedAt: new Date()
        });

      return {
        success: true,
        data: createdReply
      };
    } catch (error) {
      logger.error('Error creating community reply:', error);
      return {
        success: false,
        error: 'Failed to create reply'
      };
    }
  }

  async updateReply(id: string, updateData: UpdateReplyRequest, userId: string, isAdmin = false): Promise<ApiResponse<CommunityReply>> {
    try {
      // 获取回复信息
      const [reply] = await this.db('community_replies')
        .where('id', id);

      if (!reply) {
        return {
          success: false,
          error: 'Reply not found'
        };
      }

      // 检查权限
      if (!isAdmin && reply.authorId !== userId) {
        return {
          success: false,
          error: 'Permission denied'
        };
      }

      const [updatedReply] = await this.db('community_replies')
        .where('id', id)
        .update({
          ...updateData,
          updatedAt: new Date()
        })
        .returning('*');

      return {
        success: true,
        data: updatedReply
      };
    } catch (error) {
      logger.error('Error updating community reply:', error);
      return {
        success: false,
        error: 'Failed to update reply'
      };
    }
  }

  async deleteReply(id: string, userId: string, isAdmin = false): Promise<ApiResponse> {
    try {
      // 获取回复信息
      const [reply] = await this.db('community_replies')
        .where('id', id);

      if (!reply) {
        return {
          success: false,
          error: 'Reply not found'
        };
      }

      // 检查权限
      if (!isAdmin && reply.authorId !== userId) {
        return {
          success: false,
          error: 'Permission denied'
        };
      }

      // 软删除
      await this.db('community_replies')
        .where('id', id)
        .update({
          status: 'deleted',
          updatedAt: new Date()
        });

      // 删除相关的点赞记录
      await this.db('community_likes')
        .where('targetId', id)
        .where('targetType', 'reply')
        .del();

      // 更新帖子的回复数量
      await this.db('community_posts')
        .where('id', reply.postId)
        .decrement('replyCount', 1)
        .update({
          updatedAt: new Date()
        });

      return {
        success: true,
        message: 'Reply deleted successfully'
      };
    } catch (error) {
      logger.error('Error deleting community reply:', error);
      return {
        success: false,
        error: 'Failed to delete reply'
      };
    }
  }

  // ==================== 点赞管理 ====================

  async toggleLike(targetId: string, targetType: 'post' | 'reply', userId: string): Promise<ApiResponse<{ isLiked: boolean; likeCount: number }>> {
    try {
      // 检查是否已点赞
      const [existingLike] = await this.db('community_likes')
        .where('userId', userId)
        .where('targetId', targetId)
        .where('targetType', targetType);

      const tableName = targetType === 'post' ? 'community_posts' : 'community_replies';

      if (existingLike) {
        // 取消点赞
        await this.db('community_likes')
          .where('id', existingLike.id)
          .del();

        await this.db(tableName)
          .where('id', targetId)
          .decrement('likeCount', 1)
          .update({ updatedAt: new Date() });

        const [{ likeCount }] = await this.db(tableName)
          .where('id', targetId)
          .select('likeCount');

        return {
          success: true,
          data: {
            isLiked: false,
            likeCount
          }
        };
      } else {
        // 添加点赞
        await this.db('community_likes')
          .insert({
            id: uuidv4(),
            userId,
            targetId,
            targetType
          });

        await this.db(tableName)
          .where('id', targetId)
          .increment('likeCount', 1)
          .update({ updatedAt: new Date() });

        const [{ likeCount }] = await this.db(tableName)
          .where('id', targetId)
          .select('likeCount');

        return {
          success: true,
          data: {
            isLiked: true,
            likeCount
          }
        };
      }
    } catch (error) {
      logger.error('Error toggling like:', error);
      return {
        success: false,
        error: 'Failed to toggle like'
      };
    }
  }

  // ==================== 统计信息 ====================

  async getStats(): Promise<ApiResponse<CommunityStats>> {
    try {
      // 获取帖子总数
      const [{ totalPosts }] = await this.db('community_posts')
        .where('status', 'published')
        .count('* as total');

      // 获取回复总数
      const [{ totalReplies }] = await this.db('community_replies')
        .where('status', 'published')
        .count('* as total');

      // 获取用户总数（至少发过帖子的用户）
      const [{ totalUsers }] = await this.db('community_posts')
        .distinct('authorId')
        .count('* as total');

      // 获取活跃用户数（最近30天有活动）
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [{ activeUsers }] = await this.db('community_posts')
        .where('createdAt', '>=', thirtyDaysAgo)
        .distinct('authorId')
        .count('* as total');

      // 获取热门分类
      const topCategories = await this.db('community_categories')
        .where('status', 'active')
        .orderBy('postCount', 'desc')
        .limit(5);

      return {
        success: true,
        data: {
          totalPosts: parseInt(totalPosts),
          totalUsers: parseInt(totalUsers),
          totalReplies: parseInt(totalReplies),
          activeUsers: parseInt(activeUsers),
          topCategories
        }
      };
    } catch (error) {
      logger.error('Error getting community stats:', error);
      return {
        success: false,
        error: 'Failed to get stats'
      };
    }
  }

  // ==================== 辅助方法 ====================

  private async recordRead(userId: string, postId: string): Promise<void> {
    try {
      // 检查是否已有阅读记录
      const [existing] = await this.db('community_reads')
        .where('userId', userId)
        .where('postId', postId);

      if (existing) {
        // 更新阅读时间
        await this.db('community_reads')
          .where('userId', userId)
          .where('postId', postId)
          .update({ readAt: new Date() });
      } else {
        // 创建新的阅读记录
        await this.db('community_reads')
          .insert({
            id: uuidv4(),
            userId,
            postId,
            readAt: new Date()
          });
      }
    } catch (error) {
      logger.error('Error recording read:', error);
    }
  }

  private async incrementViewCount(postId: string): Promise<void> {
    try {
      await this.db('community_posts')
        .where('id', postId)
        .increment('viewCount', 1)
        .update({ updatedAt: new Date() });
    } catch (error) {
      logger.error('Error incrementing view count:', error);
    }
  }
}

export const communityService = new CommunityService();