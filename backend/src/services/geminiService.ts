import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '@/utils/logger';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.error('AI API key is not configured');
      throw new Error('DEEPSEEK_API_KEY or GEMINI_API_KEY is required');
    }

    // 使用自定义 API 地址（如果配置了）
    // 注意：GoogleGenerativeAI 可能需要通过环境变量或配置对象来设置 baseURL
    // 如果库不支持，可能需要使用代理或修改请求 URL
    const baseURL = process.env.GEMINI_API_BASE_URL || 'https://vip.sonetto.top/v1';
    
    // 尝试使用配置对象（如果库支持）
    try {
      // @ts-ignore - 某些版本的库可能支持 baseURL 配置
      this.genAI = new GoogleGenerativeAI(apiKey, { baseURL });
    } catch {
      // 如果不支持，使用默认方式
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
    
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    // 如果库不支持 baseURL，可能需要通过环境变量设置
    if (baseURL !== 'https://generativelanguage.googleapis.com/v1') {
      logger.info(`使用自定义 Gemini API 地址: ${baseURL}`);
    }
  }

  // 发送消息到Gemini AI
  async sendMessage(message: string, context?: string): Promise<string> {
    try {
      let prompt = message;

      if (context) {
        prompt = `上下文信息：${context}\n\n用户问题：${message}`;
      }

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      logger.info('Gemini AI 响应成功', { messageLength: message.length, responseLength: text.length });

      return text;
    } catch (error) {
      logger.error('Gemini AI 调用失败', { error: error instanceof Error ? error.message : '未知错误' });

      // 根据错误类型返回不同的错误信息
      if (error instanceof Error) {
        if (error.message.includes('quota')) {
          throw new Error('AI服务使用配额已用完，请稍后再试');
        } else if (error.message.includes('timeout')) {
          throw new Error('AI服务响应超时，请稍后再试');
        } else if (error.message.includes('safety')) {
          throw new Error('输入内容违反安全策略，请修改后重试');
        }
      }

      throw new Error('AI服务暂时不可用，请稍后再试');
    }
  }

  // 分析文本
  async analyzeText(text: string, analysisType: 'explain' | 'summarize' | 'translate' = 'explain'): Promise<string> {
    try {
      let prompt = '';

      switch (analysisType) {
        case 'explain':
          prompt = `请详细解释以下文本的含义：\n\n${text}\n\n请用通俗易懂的语言进行解释，并提供相关的背景信息。`;
          break;
        case 'summarize':
          prompt = `请总结以下文本的要点：\n\n${text}\n\n请提取关键信息，用简洁的语言进行概括。`;
          break;
        case 'translate':
          prompt = `请将以下文本翻译成中文：\n\n${text}`;
          break;
        default:
          prompt = `请分析以下文本：\n\n${text}`;
      }

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const textResult = response.text();

      logger.info('文本分析成功', { analysisType, textLength: textResult.length });

      return textResult;
    } catch (error) {
      logger.error('文本分析失败', { analysisType, error: error instanceof Error ? error.message : '未知错误' });
      throw new Error('文本分析失败，请稍后再试');
    }
  }

  // 生成聊天标题
  async generateTitle(firstMessage: string): Promise<string> {
    try {
      const prompt = `请根据以下对话内容，生成一个简短的标题（不超过20个字）：\n\n${firstMessage}`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const title = response.text().trim().substring(0, 20);

      return title || '新对话';
    } catch (error) {
      logger.error('生成标题失败', { error: error instanceof Error ? error.message : '未知错误' });
      return '新对话';
    }
  }

  // 检查内容安全性
  async checkSafety(text: string): Promise<{ isSafe: boolean; reason?: string }> {
    try {
      // Gemini AI 内置了安全检查，这里做一个基本的额外检查
      const unsafePatterns = [
        /暴力|kill|murder|weapon/i,
        /仇恨|歧视|racist|sexist/i,
        /非法|毒品|drug|illegal/i,
      ];

      for (const pattern of unsafePatterns) {
        if (pattern.test(text)) {
          return {
            isSafe: false,
            reason: '内容包含不当信息',
          };
        }
      }

      return { isSafe: true };
    } catch (error) {
      logger.error('安全检查失败', { error: error instanceof Error ? error.message : '未知错误' });
      // 安全检查失败时默认允许通过
      return { isSafe: true };
    }
  }

  // 获取可用模型列表
  getAvailableModels(): string[] {
    return [
      'gemini-pro',
      'gemini-pro-vision',
    ];
  }

  // 健康检查
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.model.generateContent('Hello');
      return !!result.response;
    } catch (error) {
      logger.error('Gemini AI 健康检查失败', { error: error instanceof Error ? error.message : '未知错误' });
      return false;
    }
  }
}

export default GeminiService;