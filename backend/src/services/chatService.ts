import { ChatSession, ChatMessage, ChatInput, AppError } from '@/types';
import { GeminiService } from '@/services/geminiService';
import { logger } from '@/utils/logger';
import db from '@/config/database';

export class ChatService {
  private geminiService: GeminiService;

  constructor() {
    this.geminiService = new GeminiService();
  }

  // 创建聊天会话
  async createSession(userId: string, options: {
    title?: string;
    model?: string;
    context?: string;
  } = {}): Promise<ChatSession> {
    try {
      const sessionId = require('uuid').v4();
      const title = options.title || '新对话';
      const model = options.model || 'gemini-pro';

      const [session] = await db('chat_sessions')
        .insert({
          id: sessionId,
          userId,
          title,
          model,
          context: options.context,
          messageCount: 0,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning('*');

      // 如果没有提供标题，使用第一条消息生成标题
      if (!options.title) {
        // 这里可以在第一条消息后异步更新标题
      }

      logger.info('聊天会话创建成功', { sessionId, userId });

      return this.mapDbSessionToSession(session);
    } catch (error) {
      logger.error('聊天会话创建失败', { userId, options, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('聊天会话创建失败', 500);
    }
  }

  // 发送消息
  async sendMessage(userId: string, chatInput: ChatInput): Promise<{
    session: ChatSession;
    userMessage: ChatMessage;
    aiMessage: ChatMessage;
  }> {
    try {
      const { message, sessionId, context } = chatInput;

      // 检查消息安全性
      const safetyCheck = await this.geminiService.checkSafety(message);
      if (!safetyCheck.isSafe) {
        throw new AppError(safetyCheck.reason || '消息内容不安全', 400);
      }

      const trx = await db.transaction();

      try {
        let session: ChatSession;

        // 如果提供了sessionId，验证并获取会话
        if (sessionId) {
          const existingSession = await trx('chat_sessions')
            .where({ id: sessionId, userId })
            .first();

          if (!existingSession) {
            throw new AppError('聊天会话不存在', 404);
          }

          session = this.mapDbSessionToSession(existingSession);
        } else {
          // 创建新会话
          session = await this.createSession(userId, { context });
        }

        // 保存用户消息
        const [userMessage] = await trx('chat_messages')
          .insert({
            id: require('uuid').v4(),
            sessionId: session.id,
            role: 'user',
            content: message,
            metadata: context ? { context } : null,
            createdAt: new Date(),
          })
          .returning('*');

        // 构建AI响应的上下文
        const aiContext = this.buildAIContext(session, message, context);

        // 调用Gemini AI
        const aiResponse = await this.geminiService.sendMessage(message, aiContext);

        // 保存AI回复
        const [aiMessage] = await trx('chat_messages')
          .insert({
            id: require('uuid').v4(),
            sessionId: session.id,
            role: 'assistant',
            content: aiResponse,
            metadata: {
              model: session.model,
              responseTime: Date.now(),
            },
            createdAt: new Date(),
          })
          .returning('*');

        // 更新会话的消息数量和最后更新时间
        await trx('chat_sessions')
          .where({ id: session.id })
          .update({
            messageCount: db.raw('messageCount + 2'),
            updatedAt: new Date(),
          });

        // 如果是新会话且没有标题，根据第一条消息生成标题
        if (!sessionId || session.title === '新对话') {
          try {
            const generatedTitle = await this.geminiService.generateTitle(message);
            await trx('chat_sessions')
              .where({ id: session.id })
              .update({
                title: generatedTitle,
                updatedAt: new Date(),
              });

            session.title = generatedTitle;
          } catch (error) {
            logger.warn('生成会话标题失败', { error: error instanceof Error ? error.message : '未知错误' });
          }
        }

        await trx.commit();

        logger.info('消息发送成功', {
          sessionId: session.id,
          userId,
          messageLength: message.length,
          responseLength: aiResponse.length
        });

        return {
          session,
          userMessage: this.mapDbMessageToMessage(userMessage),
          aiMessage: this.mapDbMessageToMessage(aiMessage),
        };
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('消息发送失败', { userId, chatInput, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('消息发送失败', 500);
    }
  }

  // 获取聊天历史
  async getChatHistory(sessionId: string, userId: string, options: {
    page?: number;
    limit?: number;
  } = {}): Promise<{
    session: ChatSession;
    messages: ChatMessage[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const { page = 1, limit = 50 } = options;
      const offset = (page - 1) * limit;

      // 验证会话是否存在且属于当前用户
      const session = await db('chat_sessions')
        .where({ id: sessionId, userId })
        .first();

      if (!session) {
        throw new AppError('聊天会话不存在', 404);
      }

      // 获取消息总数
      const [{ count }] = await db('chat_messages')
        .where({ sessionId })
        .count('* as count');

      const total = parseInt(count as string);
      const totalPages = Math.ceil(total / limit);

      // 获取消息列表
      const messages = await db('chat_messages')
        .where({ sessionId })
        .orderBy('createdAt', 'ASC')
        .limit(limit)
        .offset(offset);

      return {
        session: this.mapDbSessionToSession(session),
        messages: messages.map(msg => this.mapDbMessageToMessage(msg)),
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('获取聊天历史失败', { sessionId, userId, options, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('获取聊天历史失败', 500);
    }
  }

  // 获取用户的聊天会话列表
  async getUserSessions(userId: string, options: {
    page?: number;
    limit?: number;
    status?: 'active' | 'archived';
  } = {}): Promise<{
    sessions: ChatSession[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const { page = 1, limit = 20, status } = options;
      const offset = (page - 1) * limit;

      let query = db('chat_sessions')
        .where({ userId });

      if (status) {
        query = query.where({ status });
      }

      // 获取总数
      const totalQuery = query.clone().clearSelect().count('* as count');
      const [{ count }] = await totalQuery;
      const total = parseInt(count as string);

      // 获取会话列表
      const sessions = await query
        .orderBy('updatedAt', 'DESC')
        .limit(limit)
        .offset(offset);

      const totalPages = Math.ceil(total / limit);

      return {
        sessions: sessions.map(session => this.mapDbSessionToSession(session)),
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      logger.error('获取用户会话列表失败', { userId, options, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('获取用户会话列表失败', 500);
    }
  }

  // 删除聊天会话
  async deleteSession(sessionId: string, userId: string): Promise<void> {
    try {
      const trx = await db.transaction();

      try {
        // 验证会话是否存在且属于当前用户
        const session = await trx('chat_sessions')
          .where({ id: sessionId, userId })
          .first();

        if (!session) {
          throw new AppError('聊天会话不存在', 404);
        }

        // 删除消息（由于设置了外键约束，会自动删除）
        await trx('chat_messages')
          .where({ sessionId })
          .del();

        // 删除会话
        await trx('chat_sessions')
          .where({ id: sessionId })
          .del();

        await trx.commit();

        logger.info('聊天会话删除成功', { sessionId, userId });
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('聊天会话删除失败', { sessionId, userId, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('聊天会话删除失败', 500);
    }
  }

  // 更新会话状态
  async updateSessionStatus(sessionId: string, userId: string, status: 'active' | 'archived'): Promise<ChatSession> {
    try {
      const [session] = await db('chat_sessions')
        .where({ id: sessionId, userId })
        .update({
          status,
          updatedAt: new Date(),
        })
        .returning('*');

      if (!session) {
        throw new AppError('聊天会话不存在', 404);
      }

      logger.info('会话状态更新成功', { sessionId, status, userId });

      return this.mapDbSessionToSession(session);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('会话状态更新失败', { sessionId, status, userId, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('会话状态更新失败', 500);
    }
  }

  // 文本分析
  async analyzeText(text: string, analysisType: 'explain' | 'summarize' | 'translate' = 'explain'): Promise<string> {
    try {
      // 检查文本安全性
      const safetyCheck = await this.geminiService.checkSafety(text);
      if (!safetyCheck.isSafe) {
        throw new AppError(safetyCheck.reason || '文本内容不安全', 400);
      }

      const result = await this.geminiService.analyzeText(text, analysisType);

      logger.info('文本分析成功', { analysisType, textLength: text.length, responseLength: result.length });

      return result;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('文本分析失败', { text, analysisType, error: error instanceof Error ? error.message : '未知错误' });
      throw new AppError('文本分析失败', 500);
    }
  }

  // 构建AI响应的上下文
  private buildAIContext(session: ChatSession, currentMessage: string, additionalContext?: string): string {
    let context = '';

    // 添加会话级别的上下文
    if (session.context) {
      context += `会话背景：${session.context}\n\n`;
    }

    if (additionalContext) {
      context += `当前背景：${additionalContext}\n\n`;
    }

    // 添加角色说明
    context += `你是Captain AI的智能助手，专门为呼叫中心行业提供专业支持。\n\n`;
    context += `请根据用户的问题提供专业、准确、友好的回答。\n\n`;

    return context;
  }

  // 将数据库会话对象映射为会话类型
  private mapDbSessionToSession(dbSession: any): ChatSession {
    return {
      id: dbSession.id,
      userId: dbSession.userId,
      title: dbSession.title,
      model: dbSession.model,
      context: dbSession.context,
      messageCount: dbSession.messageCount || 0,
      status: dbSession.status,
      createdAt: new Date(dbSession.createdAt),
      updatedAt: new Date(dbSession.updatedAt),
    };
  }

  // 将数据库消息对象映射为消息类型
  private mapDbMessageToMessage(dbMessage: any): ChatMessage {
    return {
      id: dbMessage.id,
      sessionId: dbMessage.sessionId,
      role: dbMessage.role,
      content: dbMessage.content,
      metadata: dbMessage.metadata,
      createdAt: new Date(dbMessage.createdAt),
    };
  }
}

export default ChatService;