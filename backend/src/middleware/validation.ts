import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiResponse } from '@/types';

export interface ValidationSchema {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}

export class ValidationMiddleware {
  // 验证请求数据
  static validate = (schema: ValidationSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const errors: string[] = [];

      // 验证请求体
      if (schema.body) {
        const { error } = schema.body.validate(req.body);
        if (error) {
          errors.push(...error.details.map(detail => detail.message));
        }
      }

      // 验证查询参数
      if (schema.query) {
        const { error } = schema.query.validate(req.query);
        if (error) {
          errors.push(...error.details.map(detail => detail.message));
        }
      }

      // 验证路径参数
      if (schema.params) {
        const { error } = schema.params.validate(req.params);
        if (error) {
          errors.push(...error.details.map(detail => detail.message));
        }
      }

      if (errors.length > 0) {
        const response: ApiResponse = {
          success: false,
          message: '数据验证失败',
          error: errors.join(', '),
        };

        return res.status(400).json(response);
      }

      next();
    };
  };

  // 常用验证规则
  static readonly rules = {
    // 邮箱验证
    email: Joi.string().email().required().messages({
      'string.email': '请输入有效的邮箱地址',
      'any.required': '邮箱是必填项',
    }),

    // 密码验证
    password: Joi.string().min(6).max(128).required().messages({
      'string.min': '密码至少需要6个字符',
      'string.max': '密码不能超过128个字符',
      'any.required': '密码是必填项',
    }),

    // 用户名验证
    username: Joi.string().min(2).max(50).required().messages({
      'string.min': '用户名至少需要2个字符',
      'string.max': '用户名不能超过50个字符',
      'any.required': '用户名是必填项',
    }),

    // 手机号验证
    phone: Joi.string().pattern(/^1[3-9]\d{9}$/).optional().messages({
      'string.pattern.base': '请输入有效的手机号',
    }),

    // ID验证（UUID）
    id: Joi.string().uuid().required().messages({
      'string.uuid': '无效的ID格式',
      'any.required': 'ID是必填项',
    }),

    // 分页参数验证
    pagination: {
      page: Joi.number().integer().min(1).default(1).messages({
        'number.base': '页码必须是数字',
        'number.integer': '页码必须是整数',
        'number.min': '页码必须大于0',
      }),
      limit: Joi.number().integer().min(1).max(100).default(10).messages({
        'number.base': '每页数量必须是数字',
        'number.integer': '每页数量必须是整数',
        'number.min': '每页数量必须大于0',
        'number.max': '每页数量不能超过100',
      }),
    },

    // 排序参数验证
    sort: {
      field: Joi.string().optional(),
      order: Joi.string().valid('asc', 'desc').default('desc').messages({
        'any.only': '排序顺序只能是asc或desc',
      }),
    },

    // 日期范围验证
    dateRange: {
      startDate: Joi.date().optional(),
      endDate: Joi.date().min(Joi.ref('startDate')).optional().messages({
        'date.min': '结束日期不能早于开始日期',
      }),
    },

    // 博客文章验证
    blogPost: {
      title: Joi.string().min(1).max(200).required().messages({
        'string.min': '标题不能为空',
        'string.max': '标题不能超过200个字符',
        'any.required': '标题是必填项',
      }),
      summary: Joi.string().min(1).max(500).required().messages({
        'string.min': '摘要不能为空',
        'string.max': '摘要不能超过500个字符',
        'any.required': '摘要是必填项',
      }),
      content: Joi.string().min(1).required().messages({
        'string.min': '内容不能为空',
        'any.required': '内容是必填项',
      }),
      thumbnail: Joi.string().uri().optional().messages({
        'string.uri': '缩略图必须是有效的URL',
      }),
      category: Joi.string().optional(),
      tags: Joi.array().items(Joi.string()).optional(),
      status: Joi.string().valid('draft', 'published').default('draft').messages({
        'any.only': '状态只能是draft或published',
      }),
    },

    // 评论验证
    comment: {
      content: Joi.string().min(1).max(1000).required().messages({
        'string.min': '评论内容不能为空',
        'string.max': '评论内容不能超过1000个字符',
        'any.required': '评论内容是必填项',
      }),
    },

    // 笔记验证
    note: {
      content: Joi.string().min(1).max(5000).required().messages({
        'string.min': '笔记内容不能为空',
        'string.max': '笔记内容不能超过5000个字符',
        'any.required': '笔记内容是必填项',
      }),
      lessonTitle: Joi.string().max(200).optional(),
      quote: Joi.string().max(1000).optional(),
      sourceType: Joi.string().valid('article', 'video', 'manual').optional(),
      timestampDisplay: Joi.string().max(50).optional(),
    },

    // 聊天消息验证
    chatMessage: {
      message: Joi.string().min(1).max(2000).required().messages({
        'string.min': '消息内容不能为空',
        'string.max': '消息内容不能超过2000个字符',
        'any.required': '消息内容是必填项',
      }),
      sessionId: Joi.string().uuid().optional(),
    },

    // 文件上传验证
    fileUpload: {
      fieldname: Joi.string().required(),
      originalname: Joi.string().required(),
      encoding: Joi.string().required(),
      mimetype: Joi.string().valid(
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain'
      ).required().messages({
        'any.only': '不支持的文件类型',
      }),
      size: Joi.number().max(10 * 1024 * 1024).required().messages({
        'number.max': '文件大小不能超过10MB',
      }),
    },
  };

  // 预定义的验证schema
  static readonly schemas = {
    // 用户注册
    register: {
      body: Joi.object({
        name: this.rules.username,
        email: this.rules.email,
        password: this.rules.password,
        phone: this.rules.phone,
      }),
    },

    // 用户登录
    login: {
      body: Joi.object({
        email: this.rules.email,
        password: Joi.string().required().messages({
          'any.required': '密码是必填项',
        }),
      }),
    },

    // 邮箱验证
    verifyEmail: {
      body: Joi.object({
        email: this.rules.email,
        code: Joi.string().length(6).required().messages({
          'string.length': '验证码必须是6位',
          'any.required': '验证码是必填项',
        }),
      }),
    },

    // 发送验证码
    sendVerification: {
      body: Joi.object({
        email: this.rules.email,
        type: Joi.string().valid('register', 'login', 'reset').required().messages({
          'any.only': '验证码类型无效',
          'any.required': '验证码类型是必填项',
        }),
      }),
    },

    // 博客文章列表
    blogList: {
      query: Joi.object({
        ...this.rules.pagination,
        ...this.rules.sort,
        category: Joi.string().optional(),
        author: Joi.string().optional(),
        status: Joi.string().valid('published', 'draft').optional(),
        search: Joi.string().optional(),
      }),
    },

    // 博客文章详情
    blogDetail: {
      params: Joi.object({
        id: this.rules.id,
      }),
    },

    // 创建博客文章
    createBlog: {
      body: Joi.object(this.rules.blogPost),
    },

    // 更新博客文章
    updateBlog: {
      params: Joi.object({
        id: this.rules.id,
      }),
      body: Joi.object({
        title: this.rules.blogPost.title.optional(),
        summary: this.rules.blogPost.summary.optional(),
        content: this.rules.blogPost.content.optional(),
        thumbnail: this.rules.blogPost.thumbnail.optional(),
        category: this.rules.blogPost.category.optional(),
        tags: this.rules.blogPost.tags.optional(),
        status: this.rules.blogPost.status.optional(),
      }),
    },

    // 评论列表
    commentList: {
      params: Joi.object({
        postId: this.rules.id,
      }),
      query: Joi.object({
        ...this.rules.pagination,
        sort: Joi.string().valid('newest', 'oldest', 'popular').default('newest'),
      }),
    },

    // 创建评论
    createComment: {
      params: Joi.object({
        postId: this.rules.id,
      }),
      body: Joi.object({
        content: this.rules.comment.content,
      }),
    },

    // 回复评论
    replyComment: {
      params: Joi.object({
        postId: this.rules.id,
        commentId: this.rules.id,
      }),
      body: Joi.object({
        content: this.rules.comment.content,
      }),
    },

    // 用户更新
    updateUser: {
      body: Joi.object({
        name: this.rules.username.optional(),
        phone: this.rules.phone.optional(),
        avatar: Joi.string().uri().optional().messages({
          'string.uri': '头像必须是有效的URL',
        }),
      }),
    },

    // 创建笔记
    createNote: {
      body: Joi.object(this.rules.note),
    },

    // 更新笔记
    updateNote: {
      params: Joi.object({
        id: this.rules.id,
      }),
      body: Joi.object({
        content: this.rules.note.content.optional(),
        lessonTitle: this.rules.note.lessonTitle.optional(),
        quote: this.rules.note.quote.optional(),
        timestampDisplay: this.rules.note.timestampDisplay.optional(),
      }),
    },

    // 发送聊天消息
    sendChatMessage: {
      body: Joi.object(this.rules.chatMessage),
    },

    // 聊天历史
    chatHistory: {
      params: Joi.object({
        sessionId: this.rules.id,
      }),
      query: Joi.object({
        ...this.rules.pagination,
      }),
    },
  };
}

export default ValidationMiddleware;