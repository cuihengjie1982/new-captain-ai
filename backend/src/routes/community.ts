import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { communityService } from '../services/communityService';
import { logger } from '../utils/logger';

const router = Router();

// ==================== 分类路由 ====================

router.get('/categories', async (req, res) => {
  try {
    const result = await communityService.getCategories();
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Error in GET /community/categories:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ==================== 帖子路由 ====================

// 获取帖子列表
router.get('/posts', [
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('category').optional().isString().withMessage('分类必须是字符串'),
  query('search').optional().isString().withMessage('搜索关键词必须是字符串'),
  query('tags').optional().isString().withMessage('标签必须是字符串'),
  query('sortBy').optional().isIn(['latest', 'popular', 'mostReplies', 'mostViews']).withMessage('排序方式无效'),
  query('authorId').optional().isUUID().withMessage('作者ID格式无效'),
  query('isPinned').optional().isBoolean().withMessage('置顶状态必须是布尔值'),
  validateRequest
], async (req, res) => {
  try {
    const userId = req.user?.id;
    const queryData = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      category: req.query.category as string,
      search: req.query.search as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      sortBy: req.query.sortBy as any,
      authorId: req.query.authorId as string,
      isPinned: req.query.isPinned !== undefined ? req.query.isPinned === 'true' : undefined
    };

    const result = await communityService.getPosts(queryData, userId);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Error in GET /community/posts:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// 获取单个帖子
router.get('/posts/:id', [
  param('id').isUUID().withMessage('帖子ID格式无效'),
  validateRequest
], async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const result = await communityService.getPostById(id, userId);
    if (result.success) {
      res.json(result);
    } else {
      if (result.error === 'Post not found') {
        res.status(404).json(result);
      } else {
        res.status(400).json(result);
      }
    }
  } catch (error) {
    logger.error('Error in GET /community/posts/:id:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// 创建帖子
router.post('/posts', [
  authenticateToken,
  body('title').notEmpty().withMessage('标题不能为空')
    .isLength({ max: 200 }).withMessage('标题不能超过200个字符'),
  body('content').notEmpty().withMessage('内容不能为空')
    .isLength({ min: 10 }).withMessage('内容至少10个字符'),
  body('categoryId').isUUID().withMessage('分类ID格式无效'),
  body('tags').optional().isArray().withMessage('标签必须是数组'),
  body('tags.*').optional().isString().withMessage('标签必须是字符串'),
  body('requiredPlan').optional().isIn(['free', 'pro']).withMessage('访问权限设置无效'),
  validateRequest
], async (req, res) => {
  try {
    const userId = req.user.id;
    const postData = {
      title: req.body.title,
      content: req.body.content,
      categoryId: req.body.categoryId,
      tags: req.body.tags,
      requiredPlan: req.body.requiredPlan
    };

    const result = await communityService.createPost(postData, userId);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Error in POST /community/posts:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// 更新帖子
router.put('/posts/:id', [
  authenticateToken,
  param('id').isUUID().withMessage('帖子ID格式无效'),
  body('title').optional().notEmpty().withMessage('标题不能为空')
    .isLength({ max: 200 }).withMessage('标题不能超过200个字符'),
  body('content').optional().notEmpty().withMessage('内容不能为空')
    .isLength({ min: 10 }).withMessage('内容至少10个字符'),
  body('categoryId').optional().isUUID().withMessage('分类ID格式无效'),
  body('tags').optional().isArray().withMessage('标签必须是数组'),
  body('tags.*').optional().isString().withMessage('标签必须是字符串'),
  body('requiredPlan').optional().isIn(['free', 'pro']).withMessage('访问权限设置无效'),
  body('status').optional().isIn(['published', 'hidden']).withMessage('状态设置无效'),
  validateRequest
], async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const updateData = {
      title: req.body.title,
      content: req.body.content,
      categoryId: req.body.categoryId,
      tags: req.body.tags,
      requiredPlan: req.body.requiredPlan,
      status: req.body.status
    };

    const result = await communityService.updatePost(id, updateData, userId, isAdmin);
    if (result.success) {
      res.json(result);
    } else {
      if (result.error === 'Post not found') {
        res.status(404).json(result);
      } else if (result.error === 'Permission denied') {
        res.status(403).json(result);
      } else {
        res.status(400).json(result);
      }
    }
  } catch (error) {
    logger.error('Error in PUT /community/posts/:id:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// 删除帖子
router.delete('/posts/:id', [
  authenticateToken,
  param('id').isUUID().withMessage('帖子ID格式无效'),
  validateRequest
], async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const result = await communityService.deletePost(id, userId, isAdmin);
    if (result.success) {
      res.json(result);
    } else {
      if (result.error === 'Post not found') {
        res.status(404).json(result);
      } else if (result.error === 'Permission denied') {
        res.status(403).json(result);
      } else {
        res.status(400).json(result);
      }
    }
  } catch (error) {
    logger.error('Error in DELETE /community/posts/:id:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ==================== 回复路由 ====================

// 获取帖子的回复列表
router.get('/posts/:postId/replies', [
  param('postId').isUUID().withMessage('帖子ID格式无效'),
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('sortBy').optional().isIn(['latest', 'oldest', 'popular']).withMessage('排序方式无效'),
  query('parentId').optional().isUUID().withMessage('父回复ID格式无效'),
  validateRequest
], async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user?.id;
    const queryData = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      sortBy: req.query.sortBy as any,
      parentId: req.query.parentId as string
    };

    const result = await communityService.getReplies(postId, queryData, userId);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Error in GET /community/posts/:postId/replies:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// 创建回复
router.post('/posts/:postId/replies', [
  authenticateToken,
  param('postId').isUUID().withMessage('帖子ID格式无效'),
  body('content').notEmpty().withMessage('回复内容不能为空')
    .isLength({ min: 3 }).withMessage('回复内容至少3个字符'),
  body('parentId').optional().isUUID().withMessage('父回复ID格式无效'),
  validateRequest
], async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;
    const replyData = {
      content: req.body.content,
      parentId: req.body.parentId
    };

    const result = await communityService.createReply(replyData, postId, userId);
    if (result.success) {
      res.status(201).json(result);
    } else {
      if (result.error === 'Post not found' || result.error === 'Parent reply not found') {
        res.status(404).json(result);
      } else if (result.error === 'Post is locked for replies') {
        res.status(403).json(result);
      } else {
        res.status(400).json(result);
      }
    }
  } catch (error) {
    logger.error('Error in POST /community/posts/:postId/replies:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// 更新回复
router.put('/replies/:id', [
  authenticateToken,
  param('id').isUUID().withMessage('回复ID格式无效'),
  body('content').optional().notEmpty().withMessage('回复内容不能为空')
    .isLength({ min: 3 }).withMessage('回复内容至少3个字符'),
  body('status').optional().isIn(['published', 'hidden']).withMessage('状态设置无效'),
  validateRequest
], async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const updateData = {
      content: req.body.content,
      status: req.body.status
    };

    const result = await communityService.updateReply(id, updateData, userId, isAdmin);
    if (result.success) {
      res.json(result);
    } else {
      if (result.error === 'Reply not found') {
        res.status(404).json(result);
      } else if (result.error === 'Permission denied') {
        res.status(403).json(result);
      } else {
        res.status(400).json(result);
      }
    }
  } catch (error) {
    logger.error('Error in PUT /community/replies/:id:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// 删除回复
router.delete('/replies/:id', [
  authenticateToken,
  param('id').isUUID().withMessage('回复ID格式无效'),
  validateRequest
], async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const result = await communityService.deleteReply(id, userId, isAdmin);
    if (result.success) {
      res.json(result);
    } else {
      if (result.error === 'Reply not found') {
        res.status(404).json(result);
      } else if (result.error === 'Permission denied') {
        res.status(403).json(result);
      } else {
        res.status(400).json(result);
      }
    }
  } catch (error) {
    logger.error('Error in DELETE /community/replies/:id:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ==================== 点赞路由 ====================

// 切换点赞状态
router.post('/likes/:targetId', [
  authenticateToken,
  param('targetId').isUUID().withMessage('目标ID格式无效'),
  body('targetType').isIn(['post', 'reply']).withMessage('目标类型无效'),
  validateRequest
], async (req, res) => {
  try {
    const { targetId } = req.params;
    const { targetType } = req.body;
    const userId = req.user.id;

    const result = await communityService.toggleLike(targetId, targetType, userId);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Error in POST /community/likes/:targetId:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ==================== 统计路由 ====================

// 获取社区统计信息
router.get('/stats', async (req, res) => {
  try {
    const result = await communityService.getStats();
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Error in GET /community/stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;