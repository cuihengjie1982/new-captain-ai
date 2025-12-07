import OpenAI from "openai";

export interface AliyunAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AliyunAIResponse {
  success: boolean;
  message?: string;
  data?: {
    content: string;
    model: string;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  };
  error?: string;
}

/**
 * 阿里云百炼AI服务
 * 替换原有的Gemini服务，提供AI对话功能
 */
export class AliyunAIService {
  private openai: OpenAI;
  private model: string;
  private baseURL: string;

  constructor() {
    const apiKey = import.meta.env.VITE_QWEN_API_KEY || process.env.DASHSCOPE_API_KEY;

    if (!apiKey) {
      throw new Error('阿里云API Key未配置，请设置VITE_QWEN_API_KEY环境变量');
    }

    // 检查API Key格式
    if (apiKey.startsWith('sk-') && apiKey.length > 20) {
      // 有效的阿里云API Key格式
      this.openai = new OpenAI({
        apiKey,
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
      });
    } else {
      throw new Error('API Key格式错误，请使用有效的阿里云百炼API Key');
    }

    this.model = "qwen-turbo"; // 使用可用的模型
    this.baseURL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
  }

  /**
   * 发送AI对话请求
   */
  async chat(messages: AliyunAIMessage[], options?: {
    temperature?: number;
    max_tokens?: number;
    model?: string;
  }): Promise<AliyunAIResponse> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: options?.model || this.model,
        messages,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.max_tokens || 800,
      });

      return {
        success: true,
        data: {
          content: completion.choices[0].message.content || '',
          model: completion.model,
          usage: completion.usage ? {
            prompt_tokens: completion.usage.prompt_tokens,
            completion_tokens: completion.usage.completion_tokens,
            total_tokens: completion.usage.total_tokens,
          } : undefined
        }
      };

    } catch (error) {
      console.error('阿里云AI服务错误:', error);

      let errorMessage = 'AI服务请求失败';
      if (error.response) {
        errorMessage += ` (HTTP ${error.response.status})`;
        if (error.response.data?.error?.message) {
          errorMessage += `: ${error.response.data.error.message}`;
        }
      } else {
        errorMessage += `: ${error.message}`;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 为视频诊断生成对话回复
   */
  async generateDiagnosisResponse(userInput: string, context?: {
    step?: number;
    previousMessages?: string[];
  }): Promise<AliyunAIResponse> {
    const systemPrompt = `你是Captain AI，一个专业的呼叫中心运营顾问。你的任务是：

1. 用简体中文回答
2. 专业、有同理心、简洁明了
3. 通过提问深入了解用户的运营痛点
4. 不要立即提供解决方案，先理解根本原因
5. 逐步引导用户理清思路

当前对话阶段：${context?.step || 1}

请针对用户的问题提供一个简短而专业的回应，并适当地提出后续问题。`;

    const messages: AliyunAIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userInput }
    ];

    return this.chat(messages, { temperature: 0.6, max_tokens: 300 });
  }

  /**
   * 生成对话摘要
   */
  async generateSummary(conversation: string): Promise<AliyunAIResponse> {
    const messages: AliyunAIMessage[] = [
      {
        role: 'system',
        content: '请为以下对话生成一个简短的摘要（100字以内），总结用户的主要问题和当前的诊断进展：'
      },
      { role: 'user', content: conversation }
    ];

    return this.chat(messages, { temperature: 0.3, max_tokens: 150 });
  }

  /**
   * 获取服务状态
   */
  async getStatus(): Promise<{ connected: boolean; model: string; error?: string }> {
    try {
      const result = await this.chat([
        { role: 'user', content: '测试连接' }
      ], { max_tokens: 10 });

      return {
        connected: result.success,
        model: this.model,
        error: result.success ? undefined : result.error
      };
    } catch (error) {
      return {
        connected: false,
        model: this.model,
        error: error.message
      };
    }
  }

  /**
   * 设置使用的模型
   */
  setModel(model: string) {
    this.model = model;
  }

  /**
   * 获取当前模型
   */
  getModel(): string {
    return this.model;
  }
}

// 导出单例实例
export const aliyunAIService = new AliyunAIService();

// 导出便捷函数
export const sendAIMessage = async (message: string, context?: {
  step?: number;
  previousMessages?: string[];
}): Promise<AliyunAIResponse> => {
  return aliyunAIService.generateDiagnosisResponse(message, context);
};

export const generateAISummary = async (conversation: string): Promise<AliyunAIResponse> => {
  return aliyunAIService.generateSummary(conversation);
};

export const checkAIStatus = async (): Promise<{ connected: boolean; model: string; error?: string }> => {
  return aliyunAIService.getStatus();
};