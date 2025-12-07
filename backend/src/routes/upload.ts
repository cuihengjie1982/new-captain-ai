import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import Joi from 'joi';
import { AuthMiddleware, ValidationMiddleware, asyncHandler } from '@/middleware';
import { UploadService } from '@/services/uploadService';
import { ApiResponse } from '@/types';
import { logger } from '@/utils/logger';

const router = Router();
const uploadService = new UploadService();

// 配置文件上传
const storage = multer.memoryStorage();

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // 支持的文件类型：图片、PDF和视频
  const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|mp4|webm|mov|avi|mkv/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype) ||
                  file.mimetype.startsWith('video/') ||
                  file.mimetype.startsWith('image/') ||
                  file.mimetype === 'application/pdf';

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('只支持图片（JPEG, PNG, GIF, WebP）、PDF和视频文件（MP4, WebM, MOV, AVI, MKV）'));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB - 支持视频文件
  },
  fileFilter,
});

// 上传头像
router.post(
  '/avatar',
  AuthMiddleware.authenticate,
  upload.single('avatar'),
  asyncHandler(async (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的头像文件',
      });
    }

    try {
      const uploadedFile = await uploadService.handleUpload(req.user.userId, req.file, 'avatar');

      logger.userAction(req.user.userId, 'avatar_uploaded', {
        fileId: uploadedFile.id,
        originalName: uploadedFile.originalName,
        size: uploadedFile.size,
      });

      const response: ApiResponse = {
        success: true,
        message: '头像上传成功',
        data: {
          id: uploadedFile.id,
          url: uploadedFile.url,
          filename: uploadedFile.filename,
          size: uploadedFile.size,
          mimetype: uploadedFile.mimetype,
        },
      };

      res.status(201).json(response);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '头像上传失败',
      });
    }
  })
);

// 上传博客图片
router.post(
  '/blog',
  AuthMiddleware.authenticate,
  upload.single('image'),
  asyncHandler(async (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的图片文件',
      });
    }

    try {
      const uploadedFile = await uploadService.handleUpload(req.user.userId, req.file, 'blog');

      logger.userAction(req.user.userId, 'blog_image_uploaded', {
        fileId: uploadedFile.id,
        originalName: uploadedFile.originalName,
        size: uploadedFile.size,
      });

      const response: ApiResponse = {
        success: true,
        message: '图片上传成功',
        data: {
          id: uploadedFile.id,
          url: uploadedFile.url,
          filename: uploadedFile.filename,
          size: uploadedFile.size,
          mimetype: uploadedFile.mimetype,
        },
      };

      res.status(201).json(response);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '图片上传失败',
      });
    }
  })
);

// 上传文档
router.post(
  '/document',
  AuthMiddleware.authenticate,
  upload.single('document'),
  asyncHandler(async (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文档文件',
      });
    }

    try {
      const uploadedFile = await uploadService.handleUpload(req.user.userId, req.file, 'document');

      logger.userAction(req.user.userId, 'document_uploaded', {
        fileId: uploadedFile.id,
        originalName: uploadedFile.originalName,
        size: uploadedFile.size,
      });

      const response: ApiResponse = {
        success: true,
        message: '文档上传成功',
        data: {
          id: uploadedFile.id,
          url: uploadedFile.url,
          filename: uploadedFile.filename,
          originalName: uploadedFile.originalName,
          size: uploadedFile.size,
          mimetype: uploadedFile.mimetype,
        },
      };

      res.status(201).json(response);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '文档上传失败',
      });
    }
  })
);

// 上传视频
router.post(
  '/video',
  AuthMiddleware.authenticate,
  upload.single('video'),
  asyncHandler(async (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的视频文件',
      });
    }

    try {
      const uploadedFile = await uploadService.handleUpload(req.user.userId, req.file, 'video');

      logger.userAction(req.user.userId, 'video_uploaded', {
        fileId: uploadedFile.id,
        originalName: uploadedFile.originalName,
        size: uploadedFile.size,
      });

      const response: ApiResponse = {
        success: true,
        message: '视频上传成功',
        data: {
          id: uploadedFile.id,
          url: uploadedFile.url,
          filename: uploadedFile.filename,
          originalName: uploadedFile.originalName,
          size: uploadedFile.size,
          mimetype: uploadedFile.mimetype,
        },
      };

      res.status(201).json(response);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '视频上传失败',
      });
    }
  })
);

// 获取上传文件列表
router.get(
  '/',
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
      type: type as 'avatar' | 'blog' | 'video' | 'document' || undefined,
    });

    const response = {
      success: true,
      message: '获取文件列表成功',
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
  '/:id',
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

    logger.userAction(userId, 'upload_deleted', { fileId: id });

    const response: ApiResponse = {
      success: true,
      message: '文件删除成功',
    };

    res.status(200).json(response);
  })
);

// 获取文件统计信息
router.get(
  '/stats',
  AuthMiddleware.authenticate,
  asyncHandler(async (req: any, res) => {
    const userId = req.user.userId;

    const stats = await uploadService.getUploadStats(userId);

    const response: ApiResponse = {
      success: true,
      message: '获取文件统计成功',
      data: stats,
    };

    res.status(200).json(response);
  })
);

// 错误处理中间件
router.use((error: Error, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    let message = '文件上传失败';

    if (error.message.includes('File too large')) {
      message = '文件大小超过限制（最大100MB）';
    } else if (error.message.includes('Unexpected field')) {
      message = '不支持的文件字段';
    } else if (error.message.includes('Too many files')) {
      message = '一次只能上传一个文件';
    }

    return res.status(400).json({
      success: false,
      message,
    });
  }

  next(error);
});

export default router;