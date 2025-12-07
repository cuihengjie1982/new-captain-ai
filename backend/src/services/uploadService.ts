import { UploadedFile } from '@/types';
import { logger } from '@/utils/logger';
import path from 'path';
import fs from 'fs/promises';
import db from '@/config/database';

// 自定义错误类
class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UploadService {
  private readonly uploadDir: string;
  private readonly maxFileSize: number;
  private readonly allowedTypes: string[];

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || 'uploads';
    this.maxFileSize = parseInt(process.env.UPLOAD_MAX_SIZE || '104857600'); // 100MB - 支持视频文件
    this.allowedTypes = (process.env.UPLOAD_ALLOWED_TYPES || 'image/jpeg,image/png,image/gif,image/webp,application/pdf,video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska').split(',');

    // 确保上传目录存在
    this.ensureUploadDir();
  }

  // 处理文件上传
  async handleUpload(userId: string, file: Express.Multer.File, type: 'avatar' | 'blog' | 'video' | 'document' = 'document'): Promise<UploadedFile> {
    try {
      // 验证文件
      this.validateFile(file);

      // 生成唯一文件名
      const fileExtension = path.extname(file.originalname);
      const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExtension}`;
      const relativePath = path.join(this.uploadDir, filename);
      const fullPath = path.resolve(relativePath);

      // 保存文件
      await fs.writeFile(fullPath, file.buffer);

      // 生成文件URL
      const fileUrl = `${process.env.BASE_URL || 'http://localhost:3001'}/uploads/${filename}`;

      // 保存到数据库
      const [uploadedFile] = await db('user_uploads')
        .insert({
          id: require('uuid').v4(),
          userId,
          originalName: file.originalname,
          filename,
          mimetype: file.mimetype,
          size: file.size,
          path: relativePath,
          url: fileUrl,
          type,
          createdAt: new Date(),
        })
        .returning('*');

      logger.info('文件上传成功', {
        userId,
        fileId: uploadedFile.id,
        originalName: file.originalname,
        size: file.size,
        type,
      });

      return this.mapDbUploadToUpload(uploadedFile);
    } catch (error) {
      logger.error('文件上传失败', {
        userId,
        originalName: file.originalname,
        error: error instanceof Error ? error.message : '未知错误',
      });
      throw new AppError('文件上传失败', 500);
    }
  }

  // 获取用户上传文件列表
  async getUserUploads(userId: string, options: {
    page: number;
    limit: number;
    type?: 'avatar' | 'blog' | 'video' | 'document';
  }): Promise<{ uploads: UploadedFile[]; total: number; page: number; limit: number; totalPages: number }> {
    try {
      const { page, limit, type } = options;
      const offset = (page - 1) * limit;

      let query = db('user_uploads')
        .select('*')
        .where({ userId });

      if (type) {
        query = query.where('type', type);
      }

      // 获取总数
      const totalQuery = query.clone().clearSelect().count('* as count');
      const [{ count }] = await totalQuery;
      const total = parseInt(count as string);

      // 获取文件列表
      const uploads = await query
        .orderBy('createdAt', 'DESC')
        .limit(limit)
        .offset(offset);

      const totalPages = Math.ceil(total / limit);

      return {
        uploads: uploads.map(upload => this.mapDbUploadToUpload(upload)),
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error('获取用户上传文件列表失败', {
        userId,
        options,
        error: error instanceof Error ? error.message : '未知错误',
      });
      throw new AppError('获取用户上传文件列表失败', 500);
    }
  }

  // 删除上传文件
  async deleteUpload(fileId: string, userId: string): Promise<void> {
    try {
      const trx = await db.transaction();

      try {
        // 获取文件信息
        const upload = await trx('user_uploads')
          .where({ id: fileId, userId })
          .first();

        if (!upload) {
          throw new AppError('文件不存在', 404);
        }

        // 删除数据库记录
        await trx('user_uploads')
          .where({ id: fileId })
          .del();

        // 删除物理文件
        try {
          await fs.unlink(upload.path);
        } catch (error) {
          logger.warn('删除物理文件失败', {
            filePath: upload.path,
            error: error instanceof Error ? error.message : '未知错误',
          });
          // 不抛出错误，允许数据库删除成功
        }

        await trx.commit();

        logger.info('文件删除成功', { userId, fileId });
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('文件删除失败', {
        fileId,
        userId,
        error: error instanceof Error ? error.message : '未知错误',
      });
      throw new AppError('文件删除失败', 500);
    }
  }

  // 根据ID获取上传文件信息
  async getUploadById(fileId: string, userId: string): Promise<UploadedFile | null> {
    try {
      const upload = await db('user_uploads')
        .where({ id: fileId, userId })
        .first();

      return upload ? this.mapDbUploadToUpload(upload) : null;
    } catch (error) {
      logger.error('获取上传文件信息失败', {
        fileId,
        userId,
        error: error instanceof Error ? error.message : '未知错误',
      });
      return null;
    }
  }

  // 获取文件统计信息
  async getUploadStats(userId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    fileCounts: Record<string, number>;
    recentUploads: UploadedFile[];
  }> {
    try {
      const [totalFilesResult, sizeResult, typeStats, recentUploads] = await Promise.all([
        db('user_uploads')
          .where({ userId })
          .count('* as count')
          .first(),

        db('user_uploads')
          .where({ userId })
          .sum('size as totalSize')
          .first(),

        db('user_uploads')
          .where({ userId })
          .select('type')
          .select(db.raw('COUNT(*) as count'))
          .groupBy('type'),

        db('user_uploads')
          .where({ userId })
          .orderBy('createdAt', 'DESC')
          .limit(5),
      ]);

      const fileCounts: Record<string, number> = {};
      typeStats.forEach((stat: any) => {
        fileCounts[stat.type] = parseInt(stat.count);
      });

      return {
        totalFiles: parseInt(totalFilesResult.count as string),
        totalSize: parseInt(sizeResult.totalSize || '0'),
        fileCounts,
        recentUploads: recentUploads.map(upload => this.mapDbUploadToUpload(upload)),
      };
    } catch (error) {
      logger.error('获取文件统计信息失败', {
        userId,
        error: error instanceof Error ? error.message : '未知错误',
      });
      throw new AppError('获取文件统计信息失败', 500);
    }
  }

  // 验证文件
  private validateFile(file: Express.Multer.File): void {
    // 检查文件大小
    if (file.size > this.maxFileSize) {
      throw new AppError(`文件大小不能超过 ${this.formatFileSize(this.maxFileSize)}`, 400);
    }

    // 检查文件类型 - 支持视频、图片和PDF
    const isVideo = file.mimetype.startsWith('video/');
    const isImage = file.mimetype.startsWith('image/');
    const isPDF = file.mimetype === 'application/pdf';

    if (!isVideo && !isImage && !isPDF && !this.allowedTypes.includes(file.mimetype)) {
      throw new AppError('不支持的文件类型，仅支持图片、PDF和视频文件', 400);
    }

    // 检查文件名
    if (!file.originalname || file.originalname.trim() === '') {
      throw new AppError('文件名不能为空', 400);
    }

    // 检查文件扩展名
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'mp4', 'webm', 'mov', 'avi', 'mkv'];
    const fileExtension = path.extname(file.originalname).toLowerCase().slice(1);

    if (!allowedExtensions.includes(fileExtension)) {
      throw new AppError('不支持的文件扩展名，仅支持：jpg, jpeg, png, gif, webp, pdf, mp4, webm, mov, avi, mkv', 400);
    }
  }

  // 确保上传目录存在
  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  // 格式化文件大小
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 将数据库上传对象映射为上传类型
  private mapDbUploadToUpload(dbUpload: any): UploadedFile {
    return {
      id: dbUpload.id,
      userId: dbUpload.userId,
      originalName: dbUpload.originalName,
      filename: dbUpload.filename,
      mimetype: dbUpload.mimetype,
      size: dbUpload.size,
      path: dbUpload.path,
      url: dbUpload.url,
      type: dbUpload.type,
      createdAt: new Date(dbUpload.createdAt),
    };
  }
}

export default UploadService;