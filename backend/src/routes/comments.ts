import { Router } from 'express';
import Joi from 'joi';
import { AuthMiddleware, ValidationMiddleware, asyncHandler } from '@/middleware';
import { CommentService } from '@/services/commentService';
import { ApiResponse } from '@/types';
import { logger } from '@/utils/logger';

const router = Router();
const commentService = new CommentService();

// 获取文章评论列表
router.get(
  '/:postId',
  ValidationMiddleware.validate(ValidationMiddleware.schemas.commentList),
  asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { page = 1, limit = 10, sort = 'newest' } = req.query;

    const result = await commentService.getComments(postId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sort: sort as 'newest' | 'oldest' | 'popular',
    });

    const response = {
      success: true,
      message: '获取评论列表成功',
      data: result.comments,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        hasNext: result.page < result.totalPages,
        hasPrev: result.page > 1,
      },
    };

    res.status(200).json(response);
  })
);

// 发布评论
router.post(
  '/:postId',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validate(ValidationMiddleware.schemas.createComment),
  asyncHandler(async (req: any, res) => {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user.userId;

    const comment = await commentService.createComment(postId, {
      content,
      userId,
      userName: req.user.name,
      userAvatar: req.user.avatar,
    });

    logger.userAction(userId, 'comment_created', { postId, commentId: comment.id });

    const response: ApiResponse = {
      success: true,
      message: '评论发布成功',
      data: comment,
    };

    res.status(201).json(response);
  })
);

// 回复评论
router.post(
  '/:postId/:commentId',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validate(ValidationMiddleware.schemas.replyComment),
  asyncHandler(async (req: any, res) => {
    const { postId, commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.userId;

    const reply = await commentService.createReply(commentId, {
      content,
      userId,
      userName: req.user.name,
      userAvatar: req.user.avatar,
    });

    logger.userAction(userId, 'comment_replied', { postId, commentId, replyId: reply.id });

    const response: ApiResponse = {
      success: true,
      message: '回复发布成功',
      data: reply,
    };

    res.status(201).json(response);
  })
);

// 点赞/取消点赞评论
router.post(
  '/:likeType/:id/like',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validate({
    params: {
      likeType: Joi.string().valid('comment', 'reply').required(),
      id: Joi.string().uuid().required(),
    },
  }),
  asyncHandler(async (req: any, res) => {
    const { likeType, id } = req.params;
    const userId = req.user.userId;

    const result = await commentService.toggleLike(
      likeType as 'comment' | 'reply',
      id,
      userId
    );

    logger.userAction(userId, result.liked ? `${likeType}_liked` : `${likeType}_unliked`, {
      [`${likeType}Id`]: id,
      likeCount: result.likeCount
    });

    const response: ApiResponse = {
      success: true,
      message: result.liked ? '点赞成功' : '取消点赞成功',
      data: {
        liked: result.liked,
        likeCount: result.likeCount,
      },
    };

    res.status(200).json(response);
  })
);

// 删除评论
router.delete(
  '/:commentId',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validate({
    params: {
      commentId: Joi.string().uuid().required(),
    },
  }),
  asyncHandler(async (req: any, res) => {
    const { commentId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    await commentService.deleteComment(commentId, userId, userRole);

    logger.userAction(userId, 'comment_deleted', { commentId });

    const response: ApiResponse = {
      success: true,
      message: '评论删除成功',
    };

    res.status(200).json(response);
  })
);

// 删除回复
router.delete(
  '/replies/:replyId',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validate({
    params: {
      replyId: Joi.string().uuid().required(),
    },
  }),
  asyncHandler(async (req: any, res) => {
    const { replyId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    await commentService.deleteReply(replyId, userId, userRole);

    logger.userAction(userId, 'comment_reply_deleted', { replyId });

    const response: ApiResponse = {
      success: true,
      message: '回复删除成功',
    };

    res.status(200).json(response);
  })
);

// 设置/取消置顶评论（管理员功能）
router.patch(
  '/:commentId/top',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireAdmin,
  ValidationMiddleware.validate({
    params: {
      commentId: Joi.string().uuid().required(),
    },
    body: {
      isTop: Joi.boolean().required(),
    },
  }),
  asyncHandler(async (req: any, res) => {
    const { commentId } = req.params;
    const { isTop } = req.body;

    const comment = await commentService.updateCommentTop(commentId, isTop);

    logger.userAction(req.user.userId, isTop ? 'comment_topped' : 'comment_untopped', { commentId });

    const response: ApiResponse = {
      success: true,
      message: isTop ? '评论置顶成功' : '取消置顶成功',
      data: comment,
    };

    res.status(200).json(response);
  })
);

// 隐藏/显示评论（管理员功能）
router.patch(
  '/:commentId/status',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireAdmin,
  ValidationMiddleware.validate({
    params: {
      commentId: Joi.string().uuid().required(),
    },
    body: {
      status: Joi.string().valid('active', 'hidden', 'deleted').required(),
    },
  }),
  asyncHandler(async (req: any, res) => {
    const { commentId } = req.params;
    const { status } = req.body;

    const comment = await commentService.updateCommentStatus(commentId, status);

    logger.userAction(req.user.userId, `comment_status_updated`, { commentId, status });

    const response: ApiResponse = {
      success: true,
      message: '评论状态更新成功',
      data: comment,
    };

    res.status(200).json(response);
  })
);

// 获取用户的评论列表
router.get(
  '/user/:userId',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validate({
    params: {
      userId: Joi.string().uuid().required(),
    },
    query: {
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(10),
    },
  }),
  asyncHandler(async (req: any, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const currentUserId = req.user.userId;
    const currentUserRole = req.user.role;

    // 权限检查：用户只能查看自己的评论，管理员可以查看所有用户的评论
    if (userId !== currentUserId && currentUserRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权查看此用户的评论',
      });
    }

    const result = await commentService.getUserComments(userId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    const response = {
      success: true,
      message: '获取用户评论成功',
      data: result.comments,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        hasNext: result.page < result.totalPages,
        hasPrev: result.page > 1,
      },
    };

    res.status(200).json(response);
  })
);

// 获取评论统计信息
router.get(
  '/stats/:postId',
  asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const stats = await commentService.getCommentStats(postId);

    const response: ApiResponse = {
      success: true,
      message: '获取评论统计成功',
      data: stats,
    };

    res.status(200).json(response);
  })
);

// 搜索评论
router.get(
  '/search/:postId',
  ValidationMiddleware.validate({
    params: {
      postId: Joi.string().uuid().required(),
    },
    query: {
      q: Joi.string().min(1).max(100).required(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(20).default(10),
    },
  }),
  asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { q, page = 1, limit = 10 } = req.query;

    const result = await commentService.searchComments(postId, q as string, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    const response = {
      success: true,
      message: '搜索评论成功',
      data: result.comments,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        hasNext: result.page < result.totalPages,
        hasPrev: result.page > 1,
      },
      searchQuery: q,
    };

    res.status(200).json(response);
  })
);

export default router;