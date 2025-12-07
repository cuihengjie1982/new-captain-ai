// 阿里云通义千问服务 - AI对话功能
export interface QwenMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface QwenCompletionOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export class QwenService {
  private apiKey: string;
  private baseUrl: string = 'https://dashscope.aliyuncs.com/api/v1';

  constructor() {
    this.apiKey = import.meta.env.VITE_QWEN_API_KEY || '';
    if (!this.apiKey) {
      console.warn('通义千问API密钥未配置');
    }
  }

  /**
   * 发送聊天消息
   */
  async chat(
    messages: QwenMessage[],
    options: QwenCompletionOptions = {}
  ): Promise<string> {
    const {
      model = 'qwen-plus',
      temperature = 0.7,
      max_tokens = 2000,
      stream = false
    } = options;

    try {
      const response = await fetch(`${this.baseUrl}/services/aigc/text-generation/generation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          input: {
            messages,
          },
          parameters: {
            temperature,
            max_tokens,
            stream,
            result_format: 'message',
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`通义千问API错误: ${response.status} - ${errorData.message || response.statusText}`);
      }

      const data = await response.json();

      if (data.output?.choices?.[0]?.message?.content) {
        return data.output.choices[0].message.content;
      }

      throw new Error('API响应格式错误');
    } catch (error) {
      console.error('通义千问API调用失败:', error);
      throw error;
    }
  }

  /**
   * 流式聊天
   */
  async *chatStream(
    messages: QwenMessage[],
    options: QwenCompletionOptions = {}
  ): AsyncGenerator<string> {
    const { model = 'qwen-plus', temperature = 0.7, max_tokens = 2000 } = options;

    try {
      const response = await fetch(`${this.baseUrl}/services/aigc/text-generation/generation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          input: {
            messages,
          },
          parameters: {
            temperature,
            max_tokens,
            stream: true,
            result_format: 'message',
            incremental_output: true,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`通义千问API错误: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;

            try {
              const parsed = JSON.parse(data);
              if (parsed.output?.choices?.[0]?.message?.content) {
                yield parsed.output.choices[0].message.content;
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      console.error('通义千问流式API调用失败:', error);
      throw error;
    }
  }

  /**
   * 简单的文本补全
   */
  async complete(prompt: string, options: QwenCompletionOptions = {}): Promise<string> {
    const messages: QwenMessage[] = [
      { role: 'user', content: prompt }
    ];
    return this.chat(messages, options);
  }

  /**
   * 检查API是否可用
   */
  async checkHealth(): Promise<boolean> {
    try {
      await this.complete('测试消息', { max_tokens: 10 });
      return true;
    } catch (error) {
      console.error('通义千问API健康检查失败:', error);
      return false;
    }
  }
}

// 创建并导出服务实例
export const qwenService = new QwenService();

// 便捷的AI诊断助手函数
export const getAIDiagnosis = async (userInput: string, context?: string): Promise<string> {
  const messages: QwenMessage[] = [
    {
      role: 'system',
      content: `你是Captain AI的运营诊断官，专业的呼叫中心运营专家。
      你的任务是：
      1. 通过对话深入了解用户遇到的具体问题
      2. 分析问题的根本原因
      3. 提供专业的诊断建议
      4. 保持对话简洁、专业、有同理心
      5. 用中文回复，语言自然友好

      对话风格：
      - 主动引导用户深入思考
      - 多用开放式问题
      - 适时总结和确认
      - 避免过早给出解决方案`
    },
    {
      role: 'user',
      content: context ? `背景信息：${context}\n\n用户问题：${userInput}` : userInput
    }
  ];

  return qwenService.chat(messages, {
    temperature: 0.7,
    max_tokens: 500
  });
};