import apiService from './apiService';

// 聊天会话接口
export interface ChatSession {
  id: string;
  userId: string;
  title?: string;
  model: string;
  context?: string;
  messageCount: number;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

// 聊天消息接口
export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

// 发送消息参数
interface SendMessageParams {
  message: string;
  sessionId?: string;
  context?: string;
}

// 创建会话参数
interface CreateSessionParams {
  title?: string;
  model?: string;
  context?: string;
}

// 聊天会话查询参数
interface SessionsParams {
  page?: number;
  limit?: number;
  status?: 'active' | 'archived';
}

// 聊天历史查询参数
interface HistoryParams {
  page?: number;
  limit?: number;
}

// 文本分析参数
interface AnalyzeTextParams {
  text: string;
  type: 'explain' | 'summarize' | 'translate';
}

// 文本分析响应
interface AnalyzeTextResponse {
  originalText: string;
  analysisType: string;
  result: string;
}

// 发送消息响应
interface SendMessageResponse {
  session: ChatSession;
  userMessage: ChatMessage;
  aiMessage: ChatMessage;
}

// 获取可用模型响应
interface AvailableModelsResponse {
  models: string[];
  default: string;
  descriptions: Record<string, string>;
}

// 聊天统计响应
interface ChatStatsResponse {
  totalSessions: number;
  totalMessages: number;
  activeSessions: number;
  weekSessions: number;
  weekMessages: number;
}

class ChatApiService {
  // 发送消息
  async sendMessage(params: SendMessageParams): Promise<SendMessageResponse> {
    const response = await apiService.post<SendMessageResponse>('/chat/send-message', params);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || '发送消息失败');
  }

  // 创建聊天会话
  async createSession(params: CreateSessionParams): Promise<ChatSession> {
    const response = await apiService.post<ChatSession>('/chat/create-session', params);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || '创建会话失败');
  }

  // 获取聊天历史
  async getChatHistory(sessionId: string, params: HistoryParams = {}): Promise<{
    session: ChatSession;
    messages: ChatMessage[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const response = await apiService.get(`/chat/history/${sessionId}`, { params });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || '获取聊天历史失败');
  }

  // 获取用户聊天会话列表
  async getSessions(params: SessionsParams = {}): Promise<{
    sessions: ChatSession[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const response = await apiService.get('/chat/sessions', { params });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || '获取会话列表失败');
  }

  // 删除聊天会话
  async deleteSession(sessionId: string): Promise<void> {
    const response = await apiService.delete(`/chat/sessions/${sessionId}`);

    if (!response.success) {
      throw new Error(response.message || '删除会话失败');
    }
  }

  // 更新会话状态
  async updateSessionStatus(sessionId: string, status: 'active' | 'archived'): Promise<ChatSession> {
    const response = await apiService.patch(`/chat/sessions/${sessionId}/status`, { status });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || '更新会话状态失败');
  }

  // 文本分析
  async analyzeText(params: AnalyzeTextParams): Promise<AnalyzeTextResponse> {
    const response = await apiService.post<AnalyzeTextResponse>('/chat/analyze-text', params);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || '文本分析失败');
  }

  // 获取可用AI模型
  async getAvailableModels(): Promise<AvailableModelsResponse> {
    const response = await apiService.get<AvailableModelsResponse>('/chat/models');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || '获取模型列表失败');
  }

  // AI服务健康检查
  async healthCheck(): Promise<{
    status: string;
    timestamp: string;
  }> {
    const response = await apiService.get('/chat/health');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'AI服务状态检查失败');
  }

  // 获取聊天统计
  async getChatStats(): Promise<ChatStatsResponse> {
    const response = await apiService.get<ChatStatsResponse>('/chat/stats');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || '获取聊天统计失败');
  }
}

// 创建单例实例
const chatApiService = new ChatApiService();

export default chatApiService;
export type { ChatSession, ChatMessage, SendMessageResponse, AnalyzeTextResponse };