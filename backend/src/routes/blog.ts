import { Router } from 'express';
import Joi from 'joi';
import { AuthMiddleware, ValidationMiddleware, asyncHandler } from '@/middleware';
import { BlogService } from '@/services/blogService';
import { ApiResponse } from '@/types';
import { logger } from '@/utils/logger';

const router = Router();
const blogService = new BlogService();

// 获取博客文章列表（公开访问）
router.get(
  '/posts',
  ValidationMiddleware.validate(ValidationMiddleware.schemas.blogList),
  asyncHandler(async (req, res) => {
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 10,
      category: req.query.category as string,
      author: req.query.author as string,
      status: req.query.status as string || 'published',
      search: req.query.search as string,
      sortBy: req.query.sortBy as string || 'publishedAt',
      sortOrder: req.query.sortOrder as string || 'desc',
    };

    const result = await blogService.getPosts(options);

    const response = {
      success: true,
      message: '获取文章列表成功',
      data: result.posts,
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

// 获取博客文章详情（公开访问）
router.get(
  '/posts/:id',
  ValidationMiddleware.validate(ValidationMiddleware.schemas.blogDetail),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    const post = await blogService.getPostById(id, userId);

    // 如果是已发布的文章，增加浏览次数
    if (post.status === 'published') {
      await blogService.incrementViewCount(id);
    }

    const response: ApiResponse = {
      success: true,
      message: '获取文章详情成功',
      data: post,
    };

    res.status(200).json(response);
  })
);

// 创建博客文章（需要认证）
router.post(
  '/posts',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validate(ValidationMiddleware.schemas.createBlog),
  asyncHandler(async (req: any, res) => {
    const postData = {
      ...req.body,
      authorId: req.user.userId,
      author: req.user.name,
    };

    const post = await blogService.createPost(postData);

    logger.userAction(req.user.userId, 'blog_post_created', { postId: post.id, title: post.title });

    const response: ApiResponse = {
      success: true,
      message: '文章创建成功',
      data: post,
    };

    res.status(201).json(response);
  })
);

// 更新博客文章（需要认证）
router.put(
  '/posts/:id',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validate(ValidationMiddleware.schemas.updateBlog),
  asyncHandler(async (req: any, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const post = await blogService.updatePost(id, req.body, userId, userRole);

    logger.userAction(userId, 'blog_post_updated', { postId: post.id, title: post.title });

    const response: ApiResponse = {
      success: true,
      message: '文章更新成功',
      data: post,
    };

    res.status(200).json(response);
  })
);

// 删除博客文章（需要认证）
router.delete(
  '/posts/:id',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validate(ValidationMiddleware.schemas.blogDetail),
  asyncHandler(async (req: any, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    await blogService.deletePost(id, userId, userRole);

    logger.userAction(userId, 'blog_post_deleted', { postId: id });

    const response: ApiResponse = {
      success: true,
      message: '文章删除成功',
    };

    res.status(200).json(response);
  })
);

// 发布/取消发布文章（需要认证）
router.patch(
  '/posts/:id/publish',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validate(ValidationMiddleware.schemas.blogDetail),
  asyncHandler(async (req: any, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { publish } = req.body; // true: 发布, false: 取消发布

    const post = await blogService.updatePostStatus(id, publish ? 'published' : 'draft', userId, userRole);

    logger.userAction(userId, publish ? 'blog_post_published' : 'blog_post_unpublished', { postId: post.id, title: post.title });

    const response: ApiResponse = {
      success: true,
      message: publish ? '文章发布成功' : '文章已取消发布',
      data: post,
    };

    res.status(200).json(response);
  })
);

// 文章点赞/取消点赞（需要认证）
router.post(
  '/posts/:id/like',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validate(ValidationMiddleware.schemas.blogDetail),
  asyncHandler(async (req: any, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await blogService.toggleLike(id, userId);

    logger.userAction(userId, result.liked ? 'blog_post_liked' : 'blog_post_unliked', { postId: id, likeCount: result.likeCount });

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

// 获取文章分类列表（公开访问）
router.get(
  '/categories',
  asyncHandler(async (req, res) => {
    const categories = await blogService.getCategories();

    const response: ApiResponse = {
      success: true,
      message: '获取分类列表成功',
      data: categories,
    };

    res.status(200).json(response);
  })
);

// 获取用户文章列表（需要认证）
router.get(
  '/my-posts',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validate({
    query: {
      ...ValidationMiddleware.rules.pagination,
      status: Joi.string().valid('draft', 'published', 'archived').optional(),
    },
  }),
  asyncHandler(async (req: any, res) => {
    const userId = req.user.userId;
    const { page = 1, limit = 10, status } = req.query;

    const result = await blogService.getUserPosts(userId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      status: status as string,
    });

    const response = {
      success: true,
      message: '获取我的文章成功',
      data: result.posts,
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

// 获取热门文章（公开访问）
router.get(
  '/trending',
  ValidationMiddleware.validate({
    query: {
      limit: Joi.number().integer().min(1).max(20).default(10),
      days: Joi.number().integer().min(1).max(30).default(7),
    },
  }),
  asyncHandler(async (req, res) => {
    const { limit = 10, days = 7 } = req.query;

    const posts = await blogService.getTrendingPosts(parseInt(limit as string), parseInt(days as string));

    const response: ApiResponse = {
      success: true,
      message: '获取热门文章成功',
      data: posts,
    };

    res.status(200).json(response);
  })
);

// 搜索文章（公开访问）
router.get(
  '/search',
  ValidationMiddleware.validate({
    query: {
      q: Joi.string().min(1).max(100).required(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(20).default(10),
    },
  }),
  asyncHandler(async (req, res) => {
    const { q, page = 1, limit = 10 } = req.query;

    const result = await blogService.searchPosts(q as string, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    const response = {
      success: true,
      message: '搜索文章成功',
      data: result.posts,
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