import { Comment, CommentReply, CommentInput, CommentReplyInput, AppError } from '@/types';
import { logger } from '@/utils/logger';
import db from '@/config/database';

export class CommentService {
  // 获取文章评论列表
  async getComments(postId: string, options: {
    page: number;
    limit: number;
    sort: 'newest' | 'oldest' | 'popular';
  }): Promise<{ comments: (Comment & { replies: CommentReply[] })[]; total: number; page: number; limit: number; totalPages: number }> {
    try {
      const { page, limit, sort } = options;
      const offset = (page - 1) * limit;

      // 构建排序条件
      let orderByClause = 'createdAt DESC';
      switch (sort) {
        case 'oldest':
          orderByClause = 'createdAt ASC';
          break;
        case 'popular':
          orderByClause = 'likeCount DESC, createdAt DESC';
          break;
        case 'newest':
        default:
          orderByClause = 'createdAt DESC';
          break;
      }

      // 获取主评论列表（只显示活跃状态的评论）
      const commentsQuery = db('comments')
        .select('*')
        .where({ postId, status: 'active' })
        .orderByRaw(orderByClause);

      // 获取总数
      const totalQuery = commentsQuery.clone().clearSelect().count('* as count');
      const [{ count }] = await totalQuery;
      const total = parseInt(count as string);

      // 获取评论列表
      const comments = await commentsQuery
        .limit(limit)
        .offset(offset);

      // 获取每个评论的回复
      const commentsWithReplies = await Promise.all(
        comments.map(async (comment) => {
          const replies = await db('comment_replies')
            .select('*')
            .where({ commentId: comment.id, status: 'active' })
            .orderBy('createdAt', 'ASC');

          return {
            ...this.mapDbCommentToComment(comment),
            replies: replies.map(reply => this.mapDbReplyToReply(reply)),
          };
        })
      );

      const totalPages = Math.ceil(total / limit);

      return {
        comments: commentsWithReplies,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error('获取评论列表失败', { postId, options, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('获取评论列表失败', 500);
    }
  }

  // 创建评论
  async createComment(postId: string, commentData: CommentInput & {
    userId: string;
    userName: string;
    userAvatar?: string;
  }): Promise<Comment> {
    try {
      const trx = await db.transaction();

      try {
        // 创建评论
        const [comment] = await trx('comments')
          .insert({
            id: require('uuid').v4(),
            postId,
            userId: commentData.userId,
            userName: commentData.userName,
            userAvatar: commentData.userAvatar,
            content: commentData.content,
            likeCount: 0,
            replyCount: 0,
            isTop: false,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning('*');

        // 更新文章的评论数
        await trx('blog_posts')
          .where({ id: postId })
          .increment('commentCount', 1);

        await trx.commit();

        logger.info('评论创建成功', { postId, commentId: comment.id, userId: commentData.userId });

        return this.mapDbCommentToComment(comment);
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    } catch (error) {
      logger.error('评论创建失败', { postId, commentData, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('评论创建失败', 500);
    }
  }

  // 创建回复
  async createReply(commentId: string, replyData: CommentReplyInput & {
    userId: string;
    userName: string;
    userAvatar?: string;
  }): Promise<CommentReply> {
    try {
      const trx = await db.transaction();

      try {
        // 创建回复
        const [reply] = await trx('comment_replies')
          .insert({
            id: require('uuid').v4(),
            commentId,
            userId: replyData.userId,
            userName: replyData.userName,
            userAvatar: replyData.userAvatar,
            content: replyData.content,
            likeCount: 0,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning('*');

        // 更新评论的回复数
        await trx('comments')
          .where({ id: commentId })
          .increment('replyCount', 1);

        await trx.commit();

        logger.info('回复创建成功', { commentId, replyId: reply.id, userId: replyData.userId });

        return this.mapDbReplyToReply(reply);
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    } catch (error) {
      logger.error('回复创建失败', { commentId, replyData, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('回复创建失败', 500);
    }
  }

  // 点赞/取消点赞评论或回复
  async toggleLike(type: 'comment' | 'reply', id: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    try {
      const trx = await db.transaction();

      try {
        let tableName: string;
        let idField: string;

        if (type === 'comment') {
          tableName = 'comment_likes';
          idField = 'commentId';
        } else {
          tableName = 'comment_reply_likes';
          idField = 'replyId';
        }

        // 检查用户是否已经点赞
        const existingLike = await trx(tableName)
          .where({ [idField]: id, userId })
          .first();

        if (existingLike) {
          // 取消点赞
          await trx(tableName)
            .where({ [idField]: id, userId })
            .del();

          await trx(type === 'comment' ? 'comments' : 'comment_replies')
            .where({ id })
            .decrement('likeCount', 1);

          const [item] = await trx(type === 'comment' ? 'comments' : 'comment_replies')
            .where({ id })
            .select('likeCount');

          await trx.commit();

          return { liked: false, likeCount: item.likeCount };
        } else {
          // 添加点赞
          await trx(tableName)
            .insert({
              id: require('uuid').v4(),
              [idField]: id,
              userId,
              createdAt: new Date(),
            });

          await trx(type === 'comment' ? 'comments' : 'comment_replies')
            .where({ id })
            .increment('likeCount', 1);

          const [item] = await trx(type === 'comment' ? 'comments' : 'comment_replies')
            .where({ id })
            .select('likeCount');

          await trx.commit();

          return { liked: true, likeCount: item.likeCount };
        }
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    } catch (error) {
      logger.error('点赞操作失败', { type, id, userId, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('点赞操作失败', 500);
    }
  }

  // 删除评论
  async deleteComment(commentId: string, userId: string, userRole: string): Promise<void> {
    try {
      const trx = await db.transaction();

      try {
        // 检查评论是否存在
        const comment = await trx('comments')
          .where({ id: commentId })
          .first();

        if (!comment) {
          throw new AppError('评论不存在', 404);
        }

        // 权限检查：只有作者或管理员可以删除评论
        if (comment.userId !== userId && userRole !== 'admin') {
          throw new AppError('无权删除此评论', 403);
        }

        // 软删除：更新状态为deleted
        await trx('comments')
          .where({ id: commentId })
          .update({
            status: 'deleted',
            updatedAt: new Date(),
          });

        // 更新文章的评论数（如果评论之前是活跃状态）
        if (comment.status === 'active') {
          await trx('blog_posts')
            .where({ id: comment.postId })
            .decrement('commentCount', 1);
        }

        await trx.commit();

        logger.info('评论删除成功', { commentId, userId });
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('评论删除失败', { commentId, userId, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('评论删除失败', 500);
    }
  }

  // 删除回复
  async deleteReply(replyId: string, userId: string, userRole: string): Promise<void> {
    try {
      const trx = await db.transaction();

      try {
        // 检查回复是否存在
        const reply = await trx('comment_replies')
          .where({ id: replyId })
          .first();

        if (!reply) {
          throw new AppError('回复不存在', 404);
        }

        // 权限检查：只有作者或管理员可以删除回复
        if (reply.userId !== userId && userRole !== 'admin') {
          throw new AppError('无权删除此回复', 403);
        }

        // 软删除：更新状态为deleted
        await trx('comment_replies')
          .where({ id: replyId })
          .update({
            status: 'deleted',
            updatedAt: new Date(),
          });

        // 更新评论的回复数（如果回复之前是活跃状态）
        if (reply.status === 'active') {
          await trx('comments')
            .where({ id: reply.commentId })
            .decrement('replyCount', 1);
        }

        await trx.commit();

        logger.info('回复删除成功', { replyId, userId });
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('回复删除失败', { replyId, userId, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('回复删除失败', 500);
    }
  }

  // 更新评论置顶状态
  async updateCommentTop(commentId: string, isTop: boolean): Promise<Comment> {
    try {
      const [comment] = await db('comments')
        .where({ id: commentId })
        .update({
          isTop,
          updatedAt: new Date(),
        })
        .returning('*');

      if (!comment) {
        throw new AppError('评论不存在', 404);
      }

      logger.info('评论置顶状态更新成功', { commentId, isTop });

      return this.mapDbCommentToComment(comment);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('评论置顶状态更新失败', { commentId, isTop, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('评论置顶状态更新失败', 500);
    }
  }

  // 更新评论状态
  async updateCommentStatus(commentId: string, status: 'active' | 'hidden' | 'deleted'): Promise<Comment> {
    try {
      const [comment] = await db('comments')
        .where({ id: commentId })
        .update({
          status,
          updatedAt: new Date(),
        })
        .returning('*');

      if (!comment) {
        throw new AppError('评论不存在', 404);
      }

      logger.info('评论状态更新成功', { commentId, status });

      return this.mapDbCommentToComment(comment);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('评论状态更新失败', { commentId, status, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('评论状态更新失败', 500);
    }
  }

  // 获取用户的评论列表
  async getUserComments(userId: string, options: {
    page: number;
    limit: number;
  }): Promise<{ comments: Comment[]; total: number; page: number; limit: number; totalPages: number }> {
    try {
      const { page, limit } = options;
      const offset = (page - 1) * limit;

      // 获取用户的评论
      const commentsQuery = db('comments')
        .select('*')
        .where({ userId })
        .orderBy('createdAt', 'desc');

      // 获取总数
      const totalQuery = commentsQuery.clone().clearSelect().count('* as count');
      const [{ count }] = await totalQuery;
      const total = parseInt(count as string);

      // 获取评论列表
      const comments = await commentsQuery
        .limit(limit)
        .offset(offset);

      const totalPages = Math.ceil(total / limit);

      return {
        comments: comments.map(comment => this.mapDbCommentToComment(comment)),
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error('获取用户评论失败', { userId, options, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('获取用户评论失败', 500);
    }
  }

  // 获取评论统计信息
  async getCommentStats(postId: string): Promise<{
    totalComments: number;
    totalReplies: number;
    activeComments: number;
    hiddenComments: number;
    deletedComments: number;
  }> {
    try {
      const [commentStats, replyStats] = await Promise.all([
        db('comments')
          .where({ postId })
          .select('status')
          .select(db.raw('COUNT(*) as count'))
          .groupBy('status'),

        db('comment_replies')
          .join('comments', 'comment_replies.commentId', 'comments.id')
          .where('comments.postId', postId)
          .count('* as count')
          .first(),
      ]);

      const stats = {
        totalComments: 0,
        totalReplies: parseInt(replyStats.count as string),
        activeComments: 0,
        hiddenComments: 0,
        deletedComments: 0,
      };

      commentStats.forEach(stat => {
        const count = parseInt(stat.count as string);
        stats.totalComments += count;

        switch (stat.status) {
          case 'active':
            stats.activeComments = count;
            break;
          case 'hidden':
            stats.hiddenComments = count;
            break;
          case 'deleted':
            stats.deletedComments = count;
            break;
        }
      });

      return stats;
    } catch (error) {
      logger.error('获取评论统计失败', { postId, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('获取评论统计失败', 500);
    }
  }

  // 搜索评论
  async searchComments(postId: string, query: string, options: {
    page: number;
    limit: number;
  }): Promise<{ comments: (Comment & { replies: CommentReply[] })[]; total: number; page: number; limit: number; totalPages: number }> {
    try {
      const { page, limit } = options;
      const offset = (page - 1) * limit;

      // 搜索评论
      const commentsQuery = db('comments')
        .select('*')
        .where({ postId, status: 'active' })
        .where('content', 'ilike', `%${query}%`)
        .orderBy('createdAt', 'desc');

      // 获取总数
      const totalQuery = commentsQuery.clone().clearSelect().count('* as count');
      const [{ count }] = await totalQuery;
      const total = parseInt(count as string);

      // 获取搜索结果
      const comments = await commentsQuery
        .limit(limit)
        .offset(offset);

      // 获取每个评论的回复
      const commentsWithReplies = await Promise.all(
        comments.map(async (comment) => {
          const replies = await db('comment_replies')
            .select('*')
            .where({ commentId: comment.id, status: 'active' })
            .orderBy('createdAt', 'ASC');

          return {
            ...this.mapDbCommentToComment(comment),
            replies: replies.map(reply => this.mapDbReplyToReply(reply)),
          };
        })
      );

      const totalPages = Math.ceil(total / limit);

      return {
        comments: commentsWithReplies,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error('搜索评论失败', { postId, query, options, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('搜索评论失败', 500);
    }
  }

  // 将数据库评论对象映射为评论类型
  private mapDbCommentToComment(dbComment: any): Comment {
    return {
      id: dbComment.id,
      postId: dbComment.postId,
      userId: dbComment.userId,
      userName: dbComment.userName,
      userAvatar: dbComment.userAvatar,
      content: dbComment.content,
      likeCount: dbComment.likeCount || 0,
      replyCount: dbComment.replyCount || 0,
      isTop: dbComment.isTop || false,
      status: dbComment.status,
      createdAt: new Date(dbComment.createdAt),
      updatedAt: new Date(dbComment.updatedAt),
    };
  }

  // 将数据库回复对象映射为回复类型
  private mapDbReplyToReply(dbReply: any): CommentReply {
    return {
      id: dbReply.id,
      commentId: dbReply.commentId,
      userId: dbReply.userId,
      userName: dbReply.userName,
      userAvatar: dbReply.userAvatar,
      content: dbReply.content,
      likeCount: dbReply.likeCount || 0,
      status: dbReply.status,
      createdAt: new Date(dbReply.createdAt),
      updatedAt: new Date(dbReply.updatedAt),
    };
  }
}

export default CommentService;