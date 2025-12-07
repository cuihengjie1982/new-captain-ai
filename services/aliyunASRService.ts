/**
 * 阿里云语音识别服务 (ASR)
 * 使用WebSocket进行实时语音识别
 */

export interface ASRConfig {
  appkey: string;
  token: string;
  onResult?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onStatus?: (status: string) => void;
}

export interface ASRResult {
  text: string;
  isFinal: boolean;
  confidence?: number;
  timestamp?: number;
}

/**
 * 阿里云ASR WebSocket客户端
 */
export class AliyunASRService {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private config: ASRConfig;
  private isRecording = false;

  constructor(config: ASRConfig) {
    this.config = config;
  }

  /**
   * 初始化音频环境
   */
  async initialize(): Promise<boolean> {
    try {
      // 获取麦克风权限
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // 创建音频上下文
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });

      this.config.onStatus?.('音频设备初始化完成');
      return true;

    } catch (error) {
      this.config.onError?.(`音频初始化失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 开始语音识别
   */
  async startRecording(): Promise<boolean> {
    if (this.isRecording) {
      return false;
    }

    if (!this.mediaStream) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    try {
      // 建立WebSocket连接
      const wsUrl = `wss://nls-gateway-cn-shanghai.aliyuncs.com/ws/v1?token=${this.config.token}`;
      this.ws = new WebSocket(wsUrl);

      // WebSocket事件处理
      this.ws.onopen = () => {
        this.sendStartMessage();
        this.setupAudioProcessing();
        this.isRecording = true;
        this.config.onStatus?.('开始语音识别');
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        this.config.onError?.(`WebSocket错误: ${error}`);
        this.stopRecording();
      };

      this.ws.onclose = () => {
        this.isRecording = false;
        this.config.onStatus?.('语音识别已停止');
      };

      return true;

    } catch (error) {
      this.config.onError?.(`开始录音失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 停止语音识别
   */
  stopRecording(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendStopMessage();
      this.ws.close();
    }

    this.cleanupAudio();
    this.isRecording = false;
  }

  /**
   * 设置音频处理
   */
  private setupAudioProcessing(): void {
    if (!this.mediaStream || !this.audioContext) return;

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (event) => {
      if (this.isRecording && this.ws && this.ws.readyState === WebSocket.OPEN) {
        const inputData = event.inputBuffer.getChannelData(0);
        const pcmData = this.convertToPCM(inputData);
        this.sendAudioData(pcmData);
      }
    };

    source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  /**
   * 发送开始识别消息
   */
  private sendStartMessage(): void {
    if (!this.ws) return;

    const startMessage = {
      header: {
        name: "StartTranscription",
        task_id: this.generateTaskId(),
        namespace: "SpeechTranscriber"
      },
      payload: {
        appkey: this.config.appkey,
        format: "pcm",
        sample_rate: 16000,
        enable_intermediate_result: true,
        enable_punctuation_prediction: true,
        enable_inverse_text_normalization: true
      }
    };

    this.ws.send(JSON.stringify(startMessage));
  }

  /**
   * 发送停止识别消息
   */
  private sendStopMessage(): void {
    if (!this.ws) return;

    const stopMessage = {
      header: {
        name: "StopTranscription",
        task_id: this.generateTaskId(),
        namespace: "SpeechTranscriber"
      }
    };

    this.ws.send(JSON.stringify(stopMessage));
  }

  /**
   * 发送音频数据
   */
  private sendAudioData(pcmData: Int16Array): void {
    if (!this.ws) return;

    // 将Int16Array转换为base64
    const base64Data = this.arrayBufferToBase64(pcmData.buffer);

    const audioMessage = {
      header: {
        name: "SendAudio",
        task_id: this.generateTaskId(),
        namespace: "SpeechTranscriber"
      },
      payload: {
        audio: base64Data
      }
    };

    this.ws.send(JSON.stringify(audioMessage));
  }

  /**
   * 处理WebSocket消息
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      if (message.header.name === "TranscriptionResultChanged") {
        const result = message.payload.result;
        const text = result.text || '';
        const isFinal = message.header.status === 20000000000; // 最终结果

        this.config.onResult?.(text, isFinal);
      } else if (message.header.name === "TaskFailed") {
        this.config.onError?.(`识别任务失败: ${message.payload.error_message}`);
      }

    } catch (error) {
      this.config.onError?.(`消息解析失败: ${error.message}`);
    }
  }

  /**
   * 将Float32Array转换为PCM Int16Array
   */
  private convertToPCM(float32Array: Float32Array): Int16Array {
    const l = float32Array.length;
    const int16Array = new Int16Array(l);

    for (let i = 0; i < l; i++) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    return int16Array;
  }

  /**
   * ArrayBuffer转Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';

    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary);
  }

  /**
   * 生成任务ID
   */
  private generateTaskId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 清理音频资源
   */
  private cleanupAudio(): void {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * 检查录音状态
   */
  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  /**
   * 销毁实例
   */
  destroy(): void {
    this.stopRecording();
    this.cleanupAudio();
  }
}

/**
 * 简化的ASR服务 - 使用浏览器Web Speech API作为备选
 */
export class WebSpeechASRService {
  private recognition: SpeechRecognition | null = null;
  private isRecording = false;
  private config: ASRConfig;

  constructor(config: ASRConfig) {
    this.config = config;
    this.initializeRecognition();
  }

  private initializeRecognition(): void {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      this.config.onError?.('浏览器不支持语音识别');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    // 配置识别参数
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'zh-CN';
    this.recognition.maxAlternatives = 1;

    // 事件处理
    this.recognition.onstart = () => {
      this.isRecording = true;
      this.config.onStatus?.('开始语音识别');
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        this.config.onResult?.(finalTranscript, true);
      } else if (interimTranscript) {
        this.config.onResult?.(interimTranscript, false);
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.config.onError?.(`语音识别错误: ${event.error}`);
      this.stopRecording();
    };

    this.recognition.onend = () => {
      this.isRecording = false;
      this.config.onStatus?.('语音识别已停止');
    };
  }

  async startRecording(): Promise<boolean> {
    if (!this.recognition) {
      this.config.onError?.('语音识别未初始化');
      return false;
    }

    if (this.isRecording) return false;

    try {
      this.recognition.start();
      return true;
    } catch (error) {
      this.config.onError?.(`启动语音识别失败: ${error.message}`);
      return false;
    }
  }

  stopRecording(): void {
    if (this.recognition && this.isRecording) {
      this.recognition.stop();
    }
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }
}

/**
 * 创建ASR服务的工厂函数
 */
export const createASRService = (config: ASRConfig) => {
  // 如果阿里云配置完整，使用阿里云ASR
  if (config.appkey && config.token &&
      config.appkey !== 'your_appkey_here' &&
      config.token !== 'your_token_here' &&
      config.appkey.startsWith('nls_')) {
    try {
      console.log('使用阿里云ASR服务');
      return new AliyunASRService(config);
    } catch (error) {
      console.warn('阿里云ASR初始化失败，使用浏览器内置语音识别:', error);
      return new WebSpeechASRService(config);
    }
  } else {
    // 否则使用浏览器内置的语音识别
    console.log('使用浏览器内置语音识别服务');
    return new WebSpeechASRService(config);
  }
};