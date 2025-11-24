import { GoogleGenAI, Chat } from "@google/genai";

// Initialize the client only if the key is present
const getApiKey = () => process.env.API_KEY;

// Check if the key is likely a DeepSeek or OpenAI compatible key
const isDeepSeekKey = (key: string) => key.startsWith('sk-');

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

export const createChatSession = (systemInstructionOverride?: string): Chat | any | null => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("API_KEY is missing");
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
  const ai = new GoogleGenAI({ apiKey });
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: systemInstruction,
    },
  });
};

export const sendMessageToAI = async (chat: Chat | any, message: string): Promise<string> => {
  try {
    if (!chat) throw new Error("Chat session not initialized");
    
    // Both Google Chat and our DeepSeek wrapper have a sendMessage method
    // Google expects { message: string }, DeepSeek wrapper matches this signature
    const response = await chat.sendMessage({ message });
    
    return response.text || "无法生成回答，请重试。";
  } catch (error) {
    console.error("AI API Error:", error);
    return "抱歉，我现在无法连接到服务器。";
  }
};