import { GoogleGenAI, Chat } from "@google/genai";

// Initialize the client only if the key is present to avoid runtime errors on load
// In a real app, we'd handle the missing key UI more gracefully
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const createChatSession = (): Chat | null => {
  const ai = getAIClient();
  if (!ai) return null;

  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: `你叫“大副”（First Mate），是“Captain AI”的AI助手。
      你的用户是正面临员工流失和运营问题的呼叫中心经理。
      上下文：用户正在观看关于“核心人才留存”的视频培训。
      
      语言要求：必须始终使用【简体中文】回答。

      指导原则：
      1. 语气专业、富有同理心且言简意赅。
      2. 结合呼叫中心管理的具体语境。
      3. 如果你不知道答案，建议他们“升级给专家处理”。
      4. 除非用户要求详细解释，否则回答请保持在150字以内。
      `,
    },
  });
};

export const sendMessageToAI = async (chat: Chat, message: string): Promise<string> => {
  try {
    const response = await chat.sendMessage({ message });
    return response.text || "无法生成回答，请重试。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "抱歉，我现在无法连接到服务器。";
  }
};