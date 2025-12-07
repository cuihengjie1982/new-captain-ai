import { Router } from 'express';
import Joi from 'joi';
import { AuthMiddleware, ValidationMiddleware, asyncHandler } from '@/middleware';
import { UserService } from '@/services/userService';
import { NoteService } from '@/services/noteService';
import { HistoryService } from '@/services/historyService';
import { UploadService } from '@/services/uploadService';
import { AnalyticsService } from '@/services/analyticsService';
import { ApiResponse } from '@/types';
import { logger } from '@/utils/logger';

const router = Router();
const userService = new UserService();
const noteService = new NoteService();
const historyService = new HistoryService();
const uploadService = new UploadService();
const analyticsService = new AnalyticsService();

// 获取用户笔记列表
router.get(
  '/notes',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validate({
    query: {
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(10),
      sourceType: Joi.string().valid('article', 'video', 'manual').optional(),
      search: Joi.string().max(100).optional(),
    },
  }),
  asyncHandler(async (req: any, res) => {
    const userId = req.user.userId;
    const { page = 1, limit = 10, sourceType, search } = req.query;

    const result = await noteService.getUserNotes(userId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sourceType: sourceType as 'article' | 'video' | 'manual' | undefined,
      search: search as string,
    });

    const response = {
      success: true,
      message: '获取笔记列表成功',
      data: result.notes,
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

// 创建笔记
router.post(
  '/notes',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validate(ValidationMiddleware.schemas.createNote),
  asyncHandler(async (req: any, res) => {
    const userId = req.user.userId;
    const noteData = req.body;

    const note = await noteService.createNote(userId, noteData);

    // 记录用户行为
    await historyService.recordUserAction(userId, {
      actionType: 'note_create',
      itemId: note.id,
      itemType: 'note',
      metadata: { sourceType: note.sourceType, sourceId: note.sourceId },
    });

    logger.userAction(userId, 'note_created', {
      noteId: note.id,
      contentLength: note.content.length,
    });

    const response: ApiResponse = {
      success: true,
      message: '笔记创建成功',
      data: note,
    };

    res.status(201).json(response);
  })
);

// 更新笔记
router.put(
  '/notes/:id',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validate(ValidationMiddleware.schemas.updateNote),
  asyncHandler(async (req: any, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    const updateData = req.body;

    const note = await noteService.updateNote(id, userId, updateData);

    logger.userAction(userId, 'note_updated', {
      noteId: id,
      updateFields: Object.keys(updateData),
    });

    const response: ApiResponse = {
      success: true,
      message: '笔记更新成功',
      data: note,
    };

    res.status(200).json(response);
  })
);

// 删除笔记
router.delete(
  '/notes/:id',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validate({
    params: {
      id: Joi.string().uuid().required(),
    },
  }),
  asyncHandler(async (req: any, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    await noteService.deleteNote(id, userId);

    logger.userAction(userId, 'note_deleted', { noteId: id });

    const response: ApiResponse = {
      success: true,
      message: '笔记删除成功',
    };

    res.status(200).json(response);
  })
);

// 获取视频观看历史
router.get(
  '/history/videos',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validate({
    query: {
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(10),
      days: Joi.number().integer().min(1).max(365).default(30),
    },
  }),
  asyncHandler(async (req: any, res) => {
    const userId = req.user.userId;
    const { page = 1, limit = 10, days = 30 } = req.query;

    const result = await historyService.getUserHistory(userId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      actionType: 'video_watch',
      days: parseInt(days as string),
    });

    const response = {
      success: true,
      message: '获取观看历史成功',
      data: result.history,
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

// 获取文章阅读历史
router.get(
  '/history/articles',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validate({
    query: {
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(10),
      days: Joi.number().integer().min(1).max(365).default(30),
    },
  }),
  asyncHandler(async (req: any, res) => {
    const userId = req.user.userId;
    const { page = 1, limit = 10, days = 30 } = req.query;

    const result = await historyService.getUserHistory(userId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      actionType: 'article_read',
      days: parseInt(days as string),
    });

    const response = {
      success: true,
      message: '获取阅读历史成功',
      data: result.history,
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

// 记录用户行为
router.post(
  '/history',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validate({
    body: {
      actionType: Joi.string().valid('video_watch', 'article_read', 'note_create', 'comment_post').required(),
      itemId: Joi.string().uuid().required(),
      itemType: Joi.string().valid('video', 'article', 'note', 'comment').required(),
      duration: Joi.number().integer().min(0).optional(),
      progress: Joi.number().integer().min(0).max(100).optional(),
      metadata: Joi.object().optional(),
    },
  }),
  asyncHandler(async (req: any, res) => {
    const userId = req.user.userId;
    const actionData = req.body;

    await historyService.recordUserAction(userId, actionData);

    logger.userAction(userId, actionData.actionType, {
      itemId: actionData.itemId,
      itemType: actionData.itemType,
    });

    const response: ApiResponse = {
      success: true,
      message: '用户行为记录成功',
    };

    res.status(201).json(response);
  })
);

// 获取用户上传文件列表
router.get(
  '/uploads',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validate({
    query: {
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(10),
      type: Joi.string().valid('avatar', 'blog', 'video', 'document').optional(),
    },
  }),
  asyncHandler(async (req: any, res) => {
    const userId = req.user.userId;
    const { page = 1, limit = 10, type } = req.query;

    const result = await uploadService.getUserUploads(userId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      type: type as 'avatar' | 'blog' | 'video' | 'document' | undefined,
    });

    const response = {
      success: true,
      message: '获取上传文件列表成功',
      data: result.uploads,
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

// 删除上传文件
router.delete(
  '/uploads/:id',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validate({
    params: {
      id: Joi.string().uuid().required(),
    },
  }),
  asyncHandler(async (req: any, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    await uploadService.deleteUpload(id, userId);

    logger.userAction(userId, 'upload_deleted', { uploadId: id });

    const response: ApiResponse = {
      success: true,
      message: '文件删除成功',
    };

    res.status(200).json(response);
  })
);

// 获取用户学习分析数据
router.get(
  '/analytics',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validate({
    query: {
      days: Joi.number().integer().min(1).max(365).default(30),
    },
  }),
  asyncHandler(async (req: any, res) => {
    const userId = req.user.userId;
    const { days = 30 } = req.query;

    const analytics = await analyticsService.getUserAnalytics(userId, {
      days: parseInt(days as string),
    });

    const response: ApiResponse = {
      success: true,
      message: '获取学习分析数据成功',
      data: analytics,
    };

    res.status(200).json(response);
  })
);

// 获取用户学习进度统计
router.get(
  '/progress',
  AuthMiddleware.authenticate,
  asyncHandler(async (req: any, res) => {
    const userId = req.user.userId;

    const progress = await analyticsService.getUserProgress(userId);

    const response: ApiResponse = {
      success: true,
      message: '获取学习进度成功',
      data: progress,
    };

    res.status(200).json(response);
  })
);

// 获取用户设置
router.get(
  '/settings',
  AuthMiddleware.authenticate,
  asyncHandler(async (req: any, res) => {
    const userId = req.user.userId;

    const user = await userService.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
      });
    }

    const settings = {
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      plan: user.plan,
      emailVerified: user.emailVerified,
      notifications: {
        email: true,
        push: true,
        marketing: false,
      },
      privacy: {
        profilePublic: false,
        activityPublic: false,
      },
    };

    const response: ApiResponse = {
      success: true,
      message: '获取用户设置成功',
      data: settings,
    };

    res.status(200).json(response);
  })
);

// 更新用户设置
router.put(
  '/settings',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validate({
    body: {
      name: Joi.string().min(2).max(50).optional(),
      phone: Joi.string().pattern(/^1[3-9]\d{9}$/).optional(),
      avatar: Joi.string().uri().optional(),
      notifications: Joi.object({
        email: Joi.boolean().optional(),
        push: Joi.boolean().optional(),
        marketing: Joi.boolean().optional(),
      }).optional(),
      privacy: Joi.object({
        profilePublic: Joi.boolean().optional(),
        activityPublic: Joi.boolean().optional(),
      }).optional(),
    },
  }),
  asyncHandler(async (req: any, res) => {
    const userId = req.user.userId;
    const { name, phone, avatar, notifications, privacy } = req.body;

    // 更新基本信息
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (avatar !== undefined) updateData.avatar = avatar;

    if (Object.keys(updateData).length > 0) {
      await userService.update(userId, updateData);
    }

    // TODO: 保存通知和隐私设置到专门的设置表

    logger.userAction(userId, 'settings_updated', {
      updatedFields: Object.keys(updateData),
      hasNotifications: !!notifications,
      hasPrivacy: !!privacy,
    });

    const response: ApiResponse = {
      success: true,
      message: '用户设置更新成功',
    };

    res.status(200).json(response);
  })
);

export default router;