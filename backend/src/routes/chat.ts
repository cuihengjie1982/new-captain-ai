import { Router } from 'express';
import Joi from 'joi';
import { AuthMiddleware, ValidationMiddleware, asyncHandler } from '@/middleware';
import { ChatService } from '@/services/chatService';
import { ApiResponse } from '@/types';
import { logger } from '@/utils/logger';

const router = Router();
const chatService = new ChatService();

// 发送消息（创建新会话或发送到现有会话）
router.post(
  '/send-message',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validate(ValidationMiddleware.schemas.sendChatMessage),
  asyncHandler(async (req: any, res) => {
    const userId = req.user.userId;
    const { message, sessionId, context } = req.body;

    const result = await chatService.sendMessage(userId, {
      message,
      sessionId,
      context,
    });

    logger.userAction(userId, 'chat_message_sent', {
      sessionId: result.session.id,
      messageLength: message.length,
    });

    const response: ApiResponse = {
      success: true,
      message: '消息发送成功',
      data: {
        session: result.session,
        userMessage: result.userMessage,
        aiMessage: result.aiMessage,
      },
    };

    res.status(200).json(response);
  })
);

// 创建新聊天会话
router.post(
  '/create-session',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validate({
    body: {
      title: Joi.string().max(100).optional(),
      model: Joi.string().valid('gemini-pro', 'gemini-pro-vision').optional(),
      context: Joi.string().max(1000).optional(),
    },
  }),
  asyncHandler(async (req: any, res) => {
    const userId = req.user.userId;
    const { title, model, context } = req.body;

    const session = await chatService.createSession(userId, {
      title,
      model,
      context,
    });

    logger.userAction(userId, 'chat_session_created', {
      sessionId: session.id,
      title: session.title,
    });

    const response: ApiResponse = {
      success: true,
      message: '聊天会话创建成功',
      data: session,
    };

    res.status(201).json(response);
  })
);

// 获取聊天历史
router.get(
  '/history/:sessionId',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validate(ValidationMiddleware.schemas.chatHistory),
  asyncHandler(async (req: any, res) => {
    const { sessionId } = req.params;
    const userId = req.user.userId;
    const { page = 1, limit = 50 } = req.query;

    const result = await chatService.getChatHistory(sessionId, userId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    const response = {
      success: true,
      message: '获取聊天历史成功',
      data: {
        session: result.session,
        messages: result.messages,
      },
      pagination: result.pagination,
    };

    res.status(200).json(response);
  })
);

// 获取用户的聊天会话列表
router.get(
  '/sessions',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validate({
    query: {
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(20),
      status: Joi.string().valid('active', 'archived').optional(),
    },
  }),
  asyncHandler(async (req: any, res) => {
    const userId = req.user.userId;
    const { page = 1, limit = 20, status } = req.query;

    const result = await chatService.getUserSessions(userId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      status: status as 'active' | 'archived' | undefined,
    });

    const response = {
      success: true,
      message: '获取会话列表成功',
      data: result.sessions,
      pagination: result.pagination,
    };

    res.status(200).json(response);
  })
);

// 删除聊天会话
router.delete(
  '/sessions/:sessionId',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validate({
    params: {
      sessionId: Joi.string().uuid().required(),
    },
  }),
  asyncHandler(async (req: any, res) => {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    await chatService.deleteSession(sessionId, userId);

    logger.userAction(userId, 'chat_session_deleted', { sessionId });

    const response: ApiResponse = {
      success: true,
      message: '聊天会话删除成功',
    };

    res.status(200).json(response);
  })
);

// 更新会话状态（归档/激活）
router.patch(
  '/sessions/:sessionId/status',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validate({
    params: {
      sessionId: Joi.string().uuid().required(),
    },
    body: {
      status: Joi.string().valid('active', 'archived').required(),
    },
  }),
  asyncHandler(async (req: any, res) => {
    const { sessionId } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;

    const session = await chatService.updateSessionStatus(
      sessionId,
      userId,
      status as 'active' | 'archived'
    );

    logger.userAction(userId, 'chat_session_status_updated', {
      sessionId,
      status,
    });

    const response: ApiResponse = {
      success: true,
      message: '会话状态更新成功',
      data: session,
    };

    res.status(200).json(response);
  })
);

// 文本分析
router.post(
  '/analyze-text',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validate({
    body: {
      text: Joi.string().min(1).max(5000).required(),
      type: Joi.string().valid('explain', 'summarize', 'translate').default('explain'),
    },
  }),
  asyncHandler(async (req: any, res) => {
    const { text, type } = req.body;
    const userId = req.user.userId;

    const result = await chatService.analyzeText(text, type as 'explain' | 'summarize' | 'translate');

    logger.userAction(userId, 'text_analyzed', {
      textLength: text.length,
      analysisType: type,
      responseLength: result.length,
    });

    const response: ApiResponse = {
      success: true,
      message: '文本分析成功',
      data: {
        originalText: text,
        analysisType: type,
        result,
      },
    };

    res.status(200).json(response);
  })
);

// 获取可用AI模型列表
router.get(
  '/models',
  AuthMiddleware.authenticate,
  asyncHandler(async (req, res) => {
    const models = ['gemini-pro', 'gemini-pro-vision'];

    const response: ApiResponse = {
      success: true,
      message: '获取模型列表成功',
      data: {
        models,
        default: 'gemini-pro',
        descriptions: {
          'gemini-pro': '通用文本生成模型',
          'gemini-pro-vision': '多模态模型，支持图像和文本',
        },
      },
    };

    res.status(200).json(response);
  })
);

// AI服务健康检查
router.get(
  '/health',
  AuthMiddleware.authenticate,
  asyncHandler(async (req, res) => {
    const geminiService = new (require('@/services/geminiService')).GeminiService();
    const isHealthy = await geminiService.healthCheck();

    const response: ApiResponse = {
      success: true,
      message: 'AI服务状态检查完成',
      data: {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
      },
    };

    res.status(isHealthy ? 200 : 503).json(response);
  })
);

// 获取聊天统计信息
router.get(
  '/stats',
  AuthMiddleware.authenticate,
  asyncHandler(async (req: any, res) => {
    const userId = req.user.userId;
    const db = require('@/config/database').default;

    try {
      // 获取用户的聊天统计
      const [totalSessions, totalMessages, activeSessions] = await Promise.all([
        db('chat_sessions')
          .where({ userId })
          .count('* as count')
          .first(),
        db('chat_messages')
          .join('chat_sessions', 'chat_messages.sessionId', 'chat_sessions.id')
          .where('chat_sessions.userId', userId)
          .count('* as count')
          .first(),
        db('chat_sessions')
          .where({ userId, status: 'active' })
          .count('* as count')
          .first(),
      ]);

      // 获取本周聊天统计
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const [weekSessions, weekMessages] = await Promise.all([
        db('chat_sessions')
          .where({ userId })
          .where('createdAt', '>=', weekAgo)
          .count('* as count')
          .first(),
        db('chat_messages')
          .join('chat_sessions', 'chat_messages.sessionId', 'chat_sessions.id')
          .where('chat_sessions.userId', userId)
          .where('chat_messages.createdAt', '>=', weekAgo)
          .count('* as count')
          .first(),
      ]);

      const stats = {
        totalSessions: parseInt(totalSessions.count as string),
        totalMessages: parseInt(totalMessages.count as string),
        activeSessions: parseInt(activeSessions.count as string),
        weekSessions: parseInt(weekSessions.count as string),
        weekMessages: parseInt(weekMessages.count as string),
      };

      const response: ApiResponse = {
        success: true,
        message: '获取聊天统计成功',
        data: stats,
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('获取聊天统计失败', { userId, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('获取聊天统计失败', 500);
    }
  })
);

export default router;