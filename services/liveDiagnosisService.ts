import OpenAI from "openai";
import { createASRService, ASRConfig } from './aliyunASRService';

export interface LiveDiagnosisConfig {
  onTranscriptionResult?: (text: string, isFinal: boolean) => void;
  onAIResponse?: (response: string) => void;
  onConnectionStatus?: (status: 'connecting' | 'connected' | 'disconnected' | 'error', message?: string) => void;
  onError?: (error: Error) => void;
  onRecordingStatus?: (isRecording: boolean) => void;
}

export interface LiveMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * LIVE诊断服务 - 结合语音识别和AI对话
 * 使用浏览器原生录音 + 阿里云千问API的简化版本
 */
export class LiveDiagnosisService {
  private openai: OpenAI;
  private isRecording = false;
  private isProcessing = false;
  private conversationHistory: LiveMessage[] = [];
  private config: LiveDiagnosisConfig;

  // ASR服务
  private asrService: any;

  constructor(config: LiveDiagnosisConfig = {}) {
    this.config = config;

    // 初始化阿里云AI客户端
    const apiKey = import.meta.env.VITE_QWEN_API_KEY || process.env.DASHSCOPE_API_KEY;
    if (!apiKey) {
      throw new Error('阿里云API Key未配置');
    }

    this.openai = new OpenAI({
      apiKey,
      baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
    });

    // 延迟初始化ASR服务
    this.initializeASRService();
  }

  /**
   * 延迟初始化ASR服务
   */
  private initializeASRService(): void {
    try {
      const asrConfig: ASRConfig = {
        appkey: import.meta.env.VITE_TINGWU_APPKEY || '',
        token: import.meta.env.VITE_TINGWU_TOKEN || '',
        onResult: (text, isFinal) => {
          this.config.onTranscriptionResult?.(text, isFinal);

          if (isFinal && text.trim()) {
            this.processTranscription(text);
          }
        },
        onError: (error) => {
          this.config.onError?.(new Error(`ASR错误: ${error}`));
        },
        onStatus: (status) => {
          this.config.onConnectionStatus?.('connected', status);
        }
      };

      this.asrService = createASRService(asrConfig);
    } catch (error) {
      console.error('ASR服务初始化失败:', error);
      // 不抛出错误，允许在没有ASR的情况下继续运行
      console.log('将使用备用语音识别方案');
      this.asrService = null;
    }
  }

  /**
   * 检查麦克风权限
   */
  async checkMicrophonePermission(): Promise<boolean> {
    try {
      // 检查权限状态
      const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });

      if (permission.state === 'denied') {
        this.config.onError?.(new Error('麦克风权限被拒绝，请在浏览器设置中允许麦克风访问'));
        return false;
      }

      // 尝试获取麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());

      return true;

    } catch (error) {
      this.config.onError?.(new Error(`麦克风权限检查失败: ${error.message}`));
      return false;
    }
  }

  /**
   * 开始录音和LIVE会话
   */
  async startRecording(): Promise<boolean> {
    if (this.isRecording || this.isProcessing) {
      return false;
    }

    try {
      this.config.onConnectionStatus?.('connecting', '正在检查麦克风权限...');

      // 检查麦克风权限
      const hasPermission = await this.checkMicrophonePermission();
      if (!hasPermission) {
        return false;
      }

      this.config.onRecordingStatus?.(true);

      // 检查ASR服务是否可用
      if (!this.asrService) {
        this.config.onConnectionStatus?.('error', 'ASR服务未初始化，使用模拟模式');
        // 使用模拟模式
        this.isRecording = true;
        this.config.onConnectionStatus?.('connected', '模拟模式已启动，请开始说话...');
        this.startSimulatedMode();
        return true;
      }

      this.config.onConnectionStatus?.('connecting', '启动语音识别...');

      // 启动ASR服务
      const success = await this.asrService.startRecording();

      if (success) {
        this.isRecording = true;
        this.config.onConnectionStatus?.('connected', '语音识别已启动，请开始说话...');
        return true;
      } else {
        this.isRecording = false;
        this.config.onRecordingStatus?.(false);
        this.config.onError?.(new Error('启动语音识别失败'));
        return false;
      }

    } catch (error) {
      this.isRecording = false;
      this.config.onRecordingStatus?.(false);
      this.config.onError?.(new Error(`开始录音失败: ${error.message}`));
      return false;
    }
  }

  /**
   * 模拟模式 - 用于测试
   */
  private startSimulatedMode(): void {
    // 模拟语音识别结果
    const sampleTexts = [
      "我想咨询一下员工流失的问题",
      "我们的呼叫中心人员流动很频繁",
      "核心员工都离职了，新员工也不稳定",
      "绩效考核制度需要改进",
      "员工满意度比较低"
    ];

    let count = 0;
    const simulateInterval = setInterval(() => {
      if (!this.isRecording || count >= 3) {
        clearInterval(simulateInterval);
        this.stopRecording();
        return;
      }

      const randomText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
      this.config.onTranscriptionResult?.(randomText, true);
      this.processTranscription(randomText);
      count++;
    }, 3000 + Math.random() * 2000);
  }

  /**
   * 停止录音
   */
  stopRecording(): void {
    if (this.isRecording) {
      if (this.asrService) {
        this.asrService.stopRecording();
      }
      this.isRecording = false;
      this.config.onRecordingStatus?.(false);
      this.config.onConnectionStatus?.('disconnected', '语音识别已停止');
    }
  }

  /**
   * 处理语音识别结果
   */
  private async processTranscription(text: string): Promise<void> {
    if (this.isProcessing || !text.trim()) return;
    this.isProcessing = true;

    try {
      this.config.onConnectionStatus?.('connecting', '正在生成AI回复...');

      // 添加用户消息到历史
      this.addMessage('user', text);

      // 生成AI回复
      const aiResponse = await this.generateAIResponse(text);

      if (aiResponse.success) {
        this.config.onAIResponse?.(aiResponse.content);
        this.addMessage('assistant', aiResponse.content);
      } else {
        this.config.onError?.(new Error(`AI回复生成失败: ${aiResponse.error}`));
      }

      this.config.onConnectionStatus?.('connected', '处理完成');

    } catch (error) {
      this.config.onError?.(new Error(`语音处理失败: ${error.message}`));
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 生成AI回复
   */
  private async generateAIResponse(userInput: string) {
    try {
      // 构建对话上下文
      const messages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [
        {
          role: 'system',
          content: `你是Captain AI，一个专业的呼叫中心运营顾问。请：
1. 用简体中文回答
2. 专业、有同理心、简洁明了
3. 通过提问深入了解用户的运营痛点
4. 逐步引导用户理清思路
5. 回复控制在100字以内`
        }
      ];

      // 添加历史对话
      this.conversationHistory.slice(-4).forEach(msg => {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        });
      });

      // 添加当前用户输入
      messages.push({
        role: 'user',
        content: userInput
      });

      const completion = await this.openai.chat.completions.create({
        model: "qwen-turbo",
        messages,
        temperature: 0.6,
        max_tokens: 200
      });

      return {
        success: true,
        content: completion.choices[0].message.content
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 添加消息到历史记录
   */
  private addMessage(role: 'user' | 'assistant', content: string): void {
    const message: LiveMessage = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date()
    };

    this.conversationHistory.push(message);

    // 限制历史记录长度
    if (this.conversationHistory.length > 10) {
      this.conversationHistory = this.conversationHistory.slice(-10);
    }
  }

  /**
   * 获取对话历史
   */
  getConversationHistory(): LiveMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * 清除对话历史
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * 获取当前状态
   */
  getStatus(): {
    isRecording: boolean;
    isProcessing: boolean;
    isCurrentlyRecording: boolean;
  } {
    return {
      isRecording: this.isRecording,
      isProcessing: this.isProcessing,
      isCurrentlyRecording: this.asrService?.isCurrentlyRecording() || false
    };
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.stopRecording();

    if (this.asrService) {
      this.asrService.destroy();
      this.asrService = null;
    }

    this.isRecording = false;
    this.isProcessing = false;
    this.conversationHistory = [];
  }
}

// 导出工厂函数
export const createLiveDiagnosisService = (config: LiveDiagnosisConfig = {}) => {
  return new LiveDiagnosisService(config);
};