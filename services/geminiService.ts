import { GoogleGenAI, Chat } from "@google/genai";

// Get appropriate API key based on use case
const getApiKey = (useCase: 'text' | 'video' = 'text') => {
  if (useCase === 'video') {
    // For video interviews, always use Gemini API
    return import.meta.env.VITE_GEMINI_API_KEY;
  } else {
    // For text interactions, prefer DeepSeek API
    return import.meta.env.VITE_DEEPSEEK_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
  }
};

// Check if the key is likely a DeepSeek or OpenAI compatible key
const isDeepSeekKey = (key: string) => key && key.startsWith('sk-');

// Configuration for available AI Models
export const AI_MODELS = [
  { id: 'deepseek-r1', name: 'DeepSeek R1' },
  { id: 'deepseek-chat', name: 'DeepSeek V3' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' }
];

// Mock Chat Session for DeepSeek to mimic Google's Chat interface
class DeepSeekChatSession {
  private apiKey: string;
  private history: Array<{ role: string; content: string }>;
  private model: string;

  constructor(apiKey: string, systemInstruction?: string) {
    this.apiKey = apiKey;
    this.model = 'deepseek-chat';
    this.history = [];
    if (systemInstruction) {
      this.history.push({ role: 'system', content: systemInstruction });
    }
  }

  async sendMessage(params: { message: string }): Promise<{ text: string }> {
    const userMsg = { role: 'user', content: params.message };
    this.history.push(userMsg);

    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: this.history,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API Error: ${response.statusText}`);
      }

      const data = await response.json();
      const aiText = data.choices?.[0]?.message?.content || "无法生成回答。";
      
      this.history.push({ role: 'assistant', content: aiText });
      return { text: aiText };

    } catch (error) {
      console.error("DeepSeek API Request Failed:", error);
      return { text: "抱歉，AI 服务暂时无法连接。" };
    }
  }
}

export const createChatSession = (systemInstructionOverride?: string, useCase: 'text' | 'video' = 'text'): Chat | any | null => {
  const apiKey = getApiKey(useCase);
  if (!apiKey) {
    console.error(`${useCase === 'video' ? 'GEMINI_API_KEY' : 'DEEPSEEK_API_KEY'} is missing`);
    return null;
  }

  const defaultInstruction = `你叫“大副”（First Mate），是“Captain AI”的AI助手。
      你的用户是正面临员工流失和运营问题的呼叫中心经理。
      
      语言要求：必须始终使用【简体中文】回答。

      指导原则：
      1. 语气专业、富有同理心且言简意赅。
      2. 结合呼叫中心管理的具体语境。
      3. 如果你不知道答案，建议他们“升级给专家处理”。
      4. 除非用户要求详细解释，否则回答请保持在150字以内。
      `;

  const systemInstruction = systemInstructionOverride || defaultInstruction;

  // Switch implementation based on Key
  if (isDeepSeekKey(apiKey)) {
    return new DeepSeekChatSession(apiKey, systemInstruction);
  }

  // Default to Google Gemini
  // 使用自定义 API 地址
  const ai = new GoogleGenAI({ 
    apiKey,
    baseURL: import.meta.env.VITE_GEMINI_API_BASE_URL || 'https://vip.sonetto.top/v1'
  });
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: systemInstruction,
    },
  });
};

export const sendMessageToAI = async (chat: Chat | any, message: string): Promise<string> => {
  try {
    if (!chat) {
      console.error("Chat session not initialized");
      throw new Error("Chat session not initialized");
    }

    console.log("发送消息到AI服务", { messageLength: message.length, chatType: typeof chat });

    // Check if API key is invalid by testing a simple call first
    try {
      const response = await chat.sendMessage({ message });
      const result = response.text || "无法生成回答，请重试。";
      console.log("AI服务响应成功", { responseLength: result.length });
      return result;
    } catch (apiError: any) {
      console.error("AI API调用失败", { error: apiError.message, type: typeof apiError });

      if (apiError.message?.includes('Authentication Fails') || apiError.message?.includes('invalid')) {
        // Return mock response when API key is invalid
        console.warn("API密钥无效，返回模拟响应");
        return `这是对"${message.substring(0, 50)}..."的模拟回答。要获得真实的AI响应，请配置有效的API密钥。`;
      }

      if (apiError.message?.includes('quota')) {
        return "API调用配额已用完，请稍后再试。";
      }

      if (apiError.message?.includes('timeout')) {
        return "AI服务响应超时，请检查网络连接后重试。";
      }

      throw apiError;
    }
  } catch (error) {
    console.error("AI API Error:", error);
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    return `抱歉，AI服务暂时不可用。错误：${errorMsg}`;
  }
};