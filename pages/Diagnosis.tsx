import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppRoute, KnowledgeCategory, UserUpload, User, KnowledgeItem, DiagnosisSubmission } from '../types';
import { 
  ArrowRight, Send, Loader2, RotateCcw, Sparkles,
  FileText, Download, Upload, FileCheck, Mail, CheckCircle,
  X, FileSpreadsheet, Presentation, BookOpen, File, Copy, Check, Lock, Crown,
  PenTool, MessageSquare, Stethoscope, Video, Mic, StopCircle, Radio, Camera, LayoutTemplate, Settings,
  Smartphone, Monitor, Tablet, Square as SquareIcon, MessageCircle, Clock, AlertCircle, FolderOpen,
  Ratio, Grid, Bot, Disc
} from 'lucide-react';
import { getKnowledgeCategories } from '../services/resourceService';
import { saveUserUpload, getDiagnosisSubmissions, saveDiagnosisSubmission } from '../services/userDataService';
import { createChatSession, sendMessageToAI } from '../services/geminiService';
import { getDiagnosisIssues as getIssuesContent } from '../services/contentService';
import { hasPermission } from '../services/permissionService';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenAIBlob } from '@google/genai';

// --- Live API Helper Functions ---
function base64ToUint8Array(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createPcmBlob(data: Float32Array): GenAIBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: arrayBufferToBase64(int16.buffer),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// Helper Component for Copy Button
const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all opacity-0 group-hover:opacity-100"
      title="复制内容"
    >
      {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
    </button>
  );
};

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  action?: 'switch_to_expert'; 
}

const Diagnosis: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Tabs state
  const [activeTab, setActiveTab] = useState<'ai' | 'expert' | 'interview'>('ai');

  // AI Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [step, setStep] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitializedRef = useRef(false);

  // Expert Mode State
  const [expertIssueDescription, setExpertIssueDescription] = useState('');
  const [activeSubmission, setActiveSubmission] = useState<DiagnosisSubmission | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  // Step 3 States
  const [isSubmittingFile, setIsSubmittingFile] = useState(false);
  const [selectedReportFile, setSelectedReportFile] = useState<File | null>(null);
  
  // Inputs for Steps
  const [userReportDesc, setUserReportDesc] = useState('');
  const [adminReply2, setAdminReply2] = useState('');
  const [adminReply4, setAdminReply4] = useState('');
  const [step4File, setStep4File] = useState<File | null>(null); // Admin Step 4 File
  
  // Interview Mode State
  const [interviewMode, setInterviewMode] = useState<'ai' | 'video'>('ai'); // 'ai' = AI Interview, 'video' = Video Only
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecordedVideo, setHasRecordedVideo] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [aiInterviewQuestion, setAiInterviewQuestion] = useState("你好！我是 AI 诊断官。请点击左侧红色按钮开始录制，我会通过实时语音与您互动，深入了解您的需求。");
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '1:1'>('16:9');
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const liveSessionRef = useRef<any>(null); 

  // Modals State
  const [showPaymentGate, setShowPaymentGate] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [resourceModalMode, setResourceModalMode] = useState<'download' | 'select'>('download'); // select is for admin
  const [downloadedFiles, setDownloadedFiles] = useState<string[]>([]);
  
  // Knowledge Base
  const [knowledgeCategories, setKnowledgeCategories] = useState<KnowledgeCategory[]>([]);

  useEffect(() => {
     setKnowledgeCategories(getKnowledgeCategories());
     const storedUser = localStorage.getItem('captainUser');
     if (storedUser) {
         const user = JSON.parse(storedUser);
         setCurrentUser(user);
         // Load active submission for expert mode
         const submissions = getDiagnosisSubmissions();
         
         // Admin sees the latest submitted issue, User sees their own
         let mySub: DiagnosisSubmission | undefined;
         if (user.role === 'admin') {
             mySub = submissions[0]; // Just grab first for demo simplicity
         } else {
             mySub = submissions.find(s => s.userId === user.id);
         }

         if (mySub) {
             setActiveSubmission(mySub);
             setExpertIssueDescription(mySub.problemDescription || '');
             setUserReportDesc(mySub.userReportDescription || '');
             setAdminReply2(mySub.expertPreliminaryReply || '');
             setAdminReply4(mySub.expertFinalReply || '');
         }
     }
     
     // Safety cleanup on mount
     stopCamera();
     stopLiveSession();
     
     return () => {
         stopCamera();
         stopLiveSession();
     };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activeTab === 'ai') {
      scrollToBottom();
    }
  }, [messages, isTyping, activeTab]);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const initialIssue = location.state?.initialIssue;

    if (initialIssue) {
      setExpertIssueDescription(initialIssue); // Pre-fill for expert tab too
      const issues = getIssuesContent();
      const foundIssue = issues.find(i => i.title === initialIssue);
      
      let userText = initialIssue;
      if (foundIssue) {
          userText = foundIssue.userText;
      }

      setMessages([{ id: '0', sender: 'user', text: userText }]);
      setIsTyping(true);
      
      setTimeout(() => {
        let response = '';
        let nextStep = 1;
        if (foundIssue && foundIssue.aiResponse) {
            response = foundIssue.aiResponse;
        } else {
            if (userText.includes('薪') || userText.includes('钱')) {
               response = "收到。薪资确实是敏感点。除了底薪，您觉得我们的绩效奖金设计是否能拉开差距，激励到核心骨干？";
            } else if (userText.includes('流失') || userText.includes('留存')) {
               response = "明白。人员流失往往有多重因素。当骨干觉得触碰到天花板时最容易流失。目前我们除了纵向晋升（做组长），有横向发展的机会吗（如QA、培训师）？";
            } else {
               response = "好的，我已记录这个问题。为了更准确地为您提供方案，能具体描述一下目前这个情况对业务指标（如SLA、CSAT）造成的最大影响是什么吗？";
            }
        }

        setMessages(prev => [...prev, { id: 'init-ai', sender: 'ai', text: response }]);
        setIsTyping(false);
        setStep(nextStep);
      }, 1500);

    } else {
      setMessages([{
        id: '1',
        sender: 'ai',
        text: "船长你好。我了解到您正面临运营挑战。为了更好地帮助您，能否告诉我您具体担心的是哪个方面的问题？"
      }]);
    }
  }, [location.state]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      let aiResponseText = '';
      let nextStep = step + 1;
      const lowerInput = input.toLowerCase();
      let action: 'switch_to_expert' | undefined = undefined;

      if (step === 0) {
        if (lowerInput.includes('钱') || lowerInput.includes('工资') || lowerInput.includes('薪')) {
           aiResponseText = "我明白薪资是个问题。您觉得是内部公平性问题，还是外部市场给的实在太多？";
        } else {
           aiResponseText = "明白了。关于这个情况，您觉得目前最紧迫需要解决的具体痛点是什么？";
        }
      } else if (step === 1) {
        aiResponseText = "了解。那么您认为如果这个问题得到解决，我们最希望看到的关键结果（Key Result）是什么？";
      } else if (step === 2) {
        aiResponseText = "谢谢。根据您提供的信息，我已经为您初步匹配了相关的诊断工具和解决方案模版。";
        nextStep = 100;
        action = 'switch_to_expert';
      } else {
         aiResponseText = "我已记录这一点。还有其他需要补充的背景信息吗？如果没有，我们可以生成方案了。";
         nextStep = 100;
         action = 'switch_to_expert';
      }

      setMessages(prev => [...prev, { 
          id: (Date.now() + 1).toString(), 
          sender: 'ai', 
          text: aiResponseText,
          action
      }]);
      setIsTyping(false);
      setStep(nextStep);
    }, 1500);
  };

  const handleSummarize = async () => {
    if (messages.length === 0 || isTyping) return;
    setIsTyping(true);
    try {
        const chat = createChatSession();
        let summary = "";
        if (chat) {
            const conversationHistory = messages.map(m => `${m.sender}: ${m.text}`).join('\n');
            const prompt = `请为以下对话生成一个简短的摘要（100字以内），总结用户的主要问题和当前的诊断进展：\n\n${conversationHistory}`;
            summary = await sendMessageToAI(chat, prompt);
        } else {
            summary = "基于当前对话，我们已探讨了您的核心运营挑战。建议继续明确关键痛点，以便匹配最佳解决方案。";
        }
        setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'ai', text: `📝 **对话摘要**：\n${summary}` }]);
    } catch (e) {
        console.error(e);
         setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'ai', text: "抱歉，生成摘要时出现错误，请稍后再试。" }]);
    } finally {
        setIsTyping(false);
        setTimeout(scrollToBottom, 100);
    }
  };

  const restartDiagnosis = () => {
    setMessages([{
        id: 'restart',
        sender: 'ai',
        text: "好的，让我们重新开始。您想聊聊其他方面的问题吗？"
      }]);
    setStep(0);
  };

  // ... (Keep existing Interview logic) ...
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: true });
      streamRef.current = stream;
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      return true;
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("无法访问摄像头或麦克风，请检查权限设置。");
      return false;
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
        videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const startLiveSession = async () => {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) { console.error("No API key found"); return; }
    
    if (apiKey.startsWith('sk-')) {
        setAiInterviewQuestion("⚠️ 注意：当前使用的是 DeepSeek/OpenAI 兼容 Key。视频访谈（Live API）依赖 Google Gemini 模型，暂不支持此 Key。请切换到文本诊断。");
        return;
    }

    const ai = new GoogleGenAI({ apiKey });
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    try {
      let sessionPromise: Promise<any>;
      sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: async () => {
            setIsLiveConnected(true);
            setAiInterviewQuestion("正在连接 AI 诊断官...");
            
            if (streamRef.current) {
                const source = audioContext.createMediaStreamSource(streamRef.current);
                const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
                scriptProcessor.onaudioprocess = (e) => {
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcmBlob = createPcmBlob(inputData);
                    if (sessionPromise) sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                };
                source.connect(scriptProcessor);
                scriptProcessor.connect(audioContext.destination);
                liveSessionRef.current = { sessionPromise, scriptProcessor, source, audioContext };
            }

            // CRITICAL: Send initial text trigger to force AI to speak first
            try {
                const session = await sessionPromise;
                await session.send({
                    clientContent: {
                        turns: [{
                            role: 'user',
                            parts: [{ text: "诊断开始。请简短地做自我介绍（我是Captain AI的运营顾问），然后向我提出第一个关于呼叫中心运营痛点的问题。" }]
                        }],
                        turnComplete: true
                    }
                });
            } catch (e) {
                console.error("Failed to send initial trigger", e);
            }
          },
          onmessage: (msg: LiveServerMessage) => {
            if (msg.serverContent?.outputTranscription) {
               const text = msg.serverContent.outputTranscription.text;
               if (text) setAiInterviewQuestion(prev => (prev.endsWith('？') || prev.endsWith('。') || prev.includes("请点击") || prev.includes("录制") || prev.includes("注意") || prev.includes("正在连接")) ? text : prev + text);
            }
          },
          onclose: () => setIsLiveConnected(false),
          onerror: (err: any) => { 
              console.error("Gemini Live Error", err); 
              setIsLiveConnected(false);
              if (err.message?.includes('Region') || err.toString().includes('Region')) {
                  setAiInterviewQuestion("❌ 连接失败：当前地区暂不支持 Gemini Live 实时语音服务。请尝试切换 VPN 节点至美国或其它支持地区。");
              } else {
                  setAiInterviewQuestion("❌ 连接发生错误，请检查网络或刷新重试。");
              }
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: { model: "gemini-2.5-flash" },
          systemInstruction: { parts: [{ text: `You are 'Captain AI', a professional Call Center Operation Consultant acting as an interviewer. 
          Your goal is to help the user diagnose their operational problems.
          1. Speak in Mandarin Chinese (Simplified).
          2. Be professional, empathetic, and concise.
          3. Start by asking ONE specific open-ended question about their current biggest challenge.
          4. Listen to their answer, acknowledge it, and dig deeper.
          5. Do NOT provide solutions immediately. Focus on understanding the root cause.` }] },
        }
      });
    } catch (e) { console.error("Failed to connect", e); alert("无法连接到 AI 服务，请稍后再试。"); }
  };

  const stopLiveSession = () => {
    if (liveSessionRef.current) {
        liveSessionRef.current.sessionPromise.then((session: any) => session.close());
        liveSessionRef.current.source.disconnect();
        liveSessionRef.current.scriptProcessor.disconnect();
        liveSessionRef.current.audioContext.close();
        liveSessionRef.current = null;
    }
    setIsLiveConnected(false);
  };

  const handleModeSwitch = (mode: 'ai' | 'video') => {
      if (isRecording) return;
      setInterviewMode(mode);
      setHasRecordedVideo(false);
      if (mode === 'video') {
          setAiInterviewQuestion("准备就绪。点击录制按钮开始录制视频。");
      } else {
          setAiInterviewQuestion("你好！我是 AI 诊断官。请点击左侧红色按钮开始录制，我会通过实时语音与您互动，深入了解您的需求。");
      }
  };

  const handleRecordToggle = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') { mediaRecorderRef.current.stop(); }
      
      if (interviewMode === 'ai') {
          stopLiveSession();
      }
      
      stopCamera(); 
      setIsRecording(false);
      setAiInterviewQuestion(interviewMode === 'ai' ? "访谈已结束。您可以下载视频或点击红色按钮重新开始。" : "录制已完成。您可以点击下方按钮下载视频。");
    } else {
      const success = await startCamera();
      if (!success) return;
      
      setHasRecordedVideo(false); // Reset state
      await new Promise(r => setTimeout(r, 500));
      
      if (streamRef.current) {
          let options: MediaRecorderOptions = { mimeType: 'video/webm' };
          if (MediaRecorder.isTypeSupported('video/mp4')) options = { mimeType: 'video/mp4' };
          
          const recorder = new MediaRecorder(streamRef.current, options);
          recordedChunksRef.current = [];
          
          recorder.ondataavailable = (e) => { 
              if (e.data.size > 0) recordedChunksRef.current.push(e.data); 
          };
          
          // Set completion state when recording stops
          recorder.onstop = () => {
              setHasRecordedVideo(true);
          };

          recorder.start();
          mediaRecorderRef.current = recorder;
          setIsRecording(true);
          
          if (interviewMode === 'ai') {
              await startLiveSession();
          } else {
              setAiInterviewQuestion("正在录制视频... (仅本地录制)");
          }
      }
    }
  };

  const handleDownloadVideo = () => {
    if (recordedChunksRef.current.length === 0) { alert("暂无录制内容"); return; }
    const type = recordedChunksRef.current[0]?.type || 'video/webm';
    const blob = new Blob(recordedChunksRef.current, { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `interview_${Date.now()}.mp4`;
    document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a);
  };

  // --- Expert Mode Logic Update ---

  const handleStep1Submit = () => {
    if (!expertIssueDescription.trim()) return;
    if (!currentUser) { setShowPaymentGate(true); return; }
    
    const newSubmission: DiagnosisSubmission = {
        id: activeSubmission ? activeSubmission.id : Date.now().toString(),
        selectedIssues: [], 
        customIssue: 'Expert Diagnosis Request',
        problemDescription: expertIssueDescription,
        submittedAt: activeSubmission ? activeSubmission.submittedAt : new Date().toLocaleString('zh-CN'),
        user: currentUser.name,
        userId: currentUser.id,
        status: 'new',
        initialFiles: uploadedFiles
    };
    
    saveDiagnosisSubmission(newSubmission);
    setActiveSubmission(newSubmission);
    setUploadedFiles([]);
  };

  const handleStep2AdminSubmit = () => {
      if (!activeSubmission) return;
      const updated: DiagnosisSubmission = {
          ...activeSubmission,
          expertPreliminaryReply: adminReply2,
          status: 'preliminary_provided'
      };
      setActiveSubmission(updated);
      saveDiagnosisSubmission(updated);
      alert('Step 2 回复已保存');
  };

  const handleTemplateSelect = (itemName: string) => {
      if (!activeSubmission) return;
      // If in admin mode, select for the ticket. If user mode, just download (handled in item click).
      if (resourceModalMode === 'select') {
          const updated: DiagnosisSubmission = {
              ...activeSubmission,
              templateFile: itemName
          };
          setActiveSubmission(updated);
          saveDiagnosisSubmission(updated);
          setShowResourceModal(false);
      }
  };

  const handleStep3FileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setSelectedReportFile(file);
      }
  };

  const handleStep3ConfirmSubmit = () => {
      if (!activeSubmission) return;
      setIsSubmittingFile(true);
      
      setTimeout(() => {
          const updated: DiagnosisSubmission = { 
              ...activeSubmission, 
              userReportFile: selectedReportFile ? selectedReportFile.name : activeSubmission.userReportFile,
              userReportDescription: userReportDesc,
              status: 'report_submitted' 
          };
          setActiveSubmission(updated);
          saveDiagnosisSubmission(updated);
          setIsSubmittingFile(false);
          setSelectedReportFile(null); // Clear temp
          alert('诊断数据提交成功！');
      }, 1000);
  };

  const handleStep4AdminSubmit = () => {
      if (!activeSubmission) return;
      const updated: DiagnosisSubmission = {
          ...activeSubmission,
          expertFinalReply: adminReply4,
          expertFinalFile: step4File ? step4File.name : activeSubmission.expertFinalFile,
          status: 'final_provided'
      };
      setActiveSubmission(updated);
      saveDiagnosisSubmission(updated);
      alert('Step 4 方案已保存');
  };

  const handleInitialFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(file) setUploadedFiles(prev => [...prev, file.name]);
  };

  const openToolLibrary = (mode: 'download' | 'select') => {
      setResourceModalMode(mode);
      setShowResourceModal(true);
  };

  const isAdmin = currentUser?.role === 'admin';
  const isPro = currentUser?.plan === 'pro' || isAdmin;

  // Helper to handle download if resource item clicked in user mode
  const handleDownload = (fileName?: string, label?: string) => {
      if(!fileName) return;
      if (!hasPermission(currentUser, 'download_resources')) {
          setShowPaymentGate(true);
          return;
      }
      
      // Simulate actual download behavior
      const dummyContent = `[模拟文件内容]\n文件名: ${fileName}\n类型: ${label || '未知'}\n\n此文件由 Captain AI 模拟生成，用于演示下载功能。`;
      const blob = new Blob([dummyContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
  };

  return (
    <div className="h-full flex flex-col bg-white relative">
      {/* Sticky Header with Tabs */}
      <header className="bg-white border-b border-slate-200 pt-4 px-6 pb-0 sticky top-0 z-10 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="text-2xl">🧭</span> 诊断罗盘
            </h1>
            <p className="text-sm text-slate-500">主题：{location.state?.initialIssue || '运营诊断'}</p>
          </div>
          
          {activeTab === 'ai' && step >= 100 && (
            <button 
              onClick={() => navigate(AppRoute.SOLUTION)}
              className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg transition-all animate-pulse"
            >
              获取 AI 方案 <ArrowRight size={16} />
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-8 overflow-x-auto">
           <button onClick={() => setActiveTab('ai')} className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'ai' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'}`}>AI 智能诊断</button>
           <button onClick={() => setActiveTab('interview')} className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 whitespace-nowrap ${activeTab === 'interview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'}`}><Video size={14} className="mb-0.5" /> AI 视频访谈</button>
           <button onClick={() => setActiveTab('expert')} className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 whitespace-nowrap ${activeTab === 'expert' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'}`}>
              专家人工诊断
              {!hasPermission(currentUser, 'expert_diagnosis') && <Lock size={12} className="mb-0.5" />}
           </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        
        {/* --- TAB 1: AI Chat --- */}
        {activeTab === 'ai' && (
          <div className="absolute inset-0 flex flex-col">
             <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                <div className="max-w-3xl mx-auto space-y-6">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex gap-3 max-w-[85%] md:max-w-[75%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border border-white shadow-sm ${msg.sender === 'user' ? 'bg-slate-200' : 'bg-blue-600 text-white'}`}>
                          {msg.sender === 'user' ? <span className="text-lg">👤</span> : <span className="text-lg">⚓</span>}
                        </div>
                        <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100 relative group pr-10'}`}>
                          <div className="whitespace-pre-wrap">{msg.text}</div>
                          {msg.sender === 'ai' && msg.action === 'switch_to_expert' && (
                            <div className="mt-3 pt-3 border-t border-slate-200/50">
                               <button 
                                 onClick={() => setActiveTab('expert')}
                                 className="text-xs bg-white text-blue-600 px-3 py-1.5 rounded-lg font-bold shadow-sm border border-blue-100 hover:bg-blue-50 transition-colors"
                               >
                                 前往专家诊断
                               </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                       <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-2">
                          <Loader2 size={14} className="animate-spin text-blue-600" />
                          <span className="text-xs text-slate-500">Captain 正在思考...</span>
                       </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
             </div>

             {/* Input Area */}
             <div className="p-4 bg-white border-t border-slate-200">
                <div className="max-w-3xl mx-auto relative">
                   <textarea 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder="描述您遇到的问题..."
                      className="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none resize-none h-14 max-h-32 transition-all"
                   />
                   <button 
                      onClick={handleSend}
                      disabled={!input.trim() || isTyping}
                      className="absolute right-2 top-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                   >
                      <Send size={18} />
                   </button>
                </div>
                <div className="max-w-3xl mx-auto mt-2 flex justify-center">
                    <button onClick={handleSummarize} className="text-xs text-slate-400 hover:text-blue-600 flex items-center gap-1 mx-2"><Sparkles size={12} /> 生成摘要</button>
                    <button onClick={restartDiagnosis} className="text-xs text-slate-400 hover:text-red-600 flex items-center gap-1 mx-2"><RotateCcw size={12} /> 重新开始</button>
                </div>
             </div>
          </div>
        )}

        {/* --- TAB 2: Interview --- */}
        {activeTab === 'interview' && (
            <div className="absolute inset-0 flex flex-col md:flex-row">
               {/* Left: Video Area */}
               <div className="w-full md:w-1/2 bg-black relative flex flex-col items-center justify-center p-4">
                   
                   {/* Header with Mode Switcher */}
                   <div className="w-full max-w-lg mb-6 flex flex-col gap-4">
                       {/* Mode Switcher */}
                       <div className="flex gap-3 w-full max-w-lg">
                            <button 
                                onClick={() => handleModeSwitch('video')}
                                disabled={isRecording}
                                className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all font-bold border-2 disabled:opacity-50 disabled:cursor-not-allowed ${interviewMode === 'video' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-900/50' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:border-slate-600'}`}
                            >
                                <Video size={20} />
                                仅视频录制
                            </button>
                            <button 
                                onClick={() => handleModeSwitch('ai')}
                                disabled={isRecording}
                                className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all font-bold border-2 disabled:opacity-50 disabled:cursor-not-allowed ${interviewMode === 'ai' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:border-slate-600'}`}
                            >
                                <Bot size={20} />
                                AI 诊断官访谈
                            </button>
                       </div>

                       <div className="flex justify-between items-end">
                           <div>
                               <h3 className="text-white font-bold text-lg mb-1 flex items-center gap-2">
                                   {interviewMode === 'ai' ? <Sparkles size={20} className="text-indigo-400" /> : <Video size={20} className="text-blue-500" />}
                                   {interviewMode === 'ai' ? 'AI 智能访谈' : '视频需求录制'}
                               </h3>
                               <p className="text-slate-400 text-xs max-w-xs leading-relaxed">
                                   {interviewMode === 'ai' 
                                     ? 'AI 将引导您理清思路，通过对话深入挖掘痛点。' 
                                     : '像与真人聊天一样，通过视频口述您的需求，仅录制不交互。'}
                               </p>
                           </div>
                           <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                               <button 
                                   onClick={() => setVideoAspectRatio('16:9')}
                                   className={`px-3 py-1.5 text-xs font-bold rounded transition-colors flex items-center gap-1 ${videoAspectRatio === '16:9' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                               >
                                   <Ratio size={12} /> 16:9
                               </button>
                               <button 
                                   onClick={() => setVideoAspectRatio('1:1')}
                                   className={`px-3 py-1.5 text-xs font-bold rounded transition-colors flex items-center gap-1 ${videoAspectRatio === '1:1' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                               >
                                   <Grid size={12} /> 1:1
                               </button>
                           </div>
                       </div>
                   </div>

                   {/* Video Container */}
                   <div className={`relative w-full max-w-lg ${videoAspectRatio === '16:9' ? 'aspect-video' : 'aspect-square'} bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 transition-all duration-500 ease-in-out`}>
                       <video ref={videoRef} className="w-full h-full object-cover transform scale-x-[-1]" muted playsInline />
                       
                       {!isCameraActive && (
                           <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                               <Camera size={48} className="mb-4 opacity-50" />
                               <p>摄像头未开启</p>
                           </div>
                       )}

                       <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6">
                           <button 
                             onClick={handleRecordToggle}
                             className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${isRecording ? 'bg-red-600 scale-110 shadow-red-600/50 shadow-lg' : 'bg-white hover:bg-slate-200'}`}
                           >
                               {isRecording ? <StopCircle size={32} className="text-white" /> : <div className="w-6 h-6 rounded-full bg-red-600"></div>}
                           </button>
                       </div>
                   </div>
                   
                   <div className="mt-6 flex gap-4">
                       {hasRecordedVideo && !isRecording && (
                           <button 
                               onClick={handleDownloadVideo} 
                               className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                           >
                               <Download size={18} /> 下载本次录像 (.mp4)
                           </button>
                       )}
                   </div>
               </div>

               {/* Right: AI Avatar/Status */}
               <div className="w-full md:w-1/2 bg-slate-900 text-white p-8 flex flex-col justify-center items-center text-center border-l border-slate-800">
                   <div className={`w-32 h-32 rounded-full mb-8 flex items-center justify-center transition-all duration-500 ${isLiveConnected || (interviewMode === 'video' && isRecording) ? 'bg-blue-600 shadow-[0_0_40px_rgba(37,99,235,0.5)] animate-pulse' : 'bg-slate-800'}`}>
                       {interviewMode === 'ai' ? (
                           isLiveConnected ? <Radio size={48} className="text-white" /> : <Mic size={48} className="text-slate-600" />
                       ) : (
                           isRecording ? <Disc size={48} className="text-white animate-spin" /> : <Video size={48} className="text-slate-600" />
                       )}
                   </div>
                   
                   <h3 className="text-2xl font-bold mb-4">
                       {interviewMode === 'ai' ? 'AI 诊断官' : '视频录制'}
                   </h3>
                   
                   <p className={`text-lg leading-relaxed max-w-md transition-opacity duration-500 ${isLiveConnected || isRecording ? 'text-blue-200' : 'text-slate-500'}`}>
                       "{aiInterviewQuestion}"
                   </p>
                   
                   {!isLiveConnected && !isRecording && (
                       <p className="mt-8 text-sm text-slate-600 flex items-center gap-2">
                           <AlertCircle size={14} /> 请点击左侧录制按钮开始{interviewMode === 'ai' ? '对话' : '录制'}
                       </p>
                   )}
               </div>
            </div>
        )}

        {/* --- TAB 3: Expert --- */}
        {activeTab === 'expert' && (
            <div className="absolute inset-0 overflow-y-auto bg-slate-50 p-6">
                <div className="max-w-4xl mx-auto">
                    {/* Steps Timeline */}
                    <div className="mb-8 flex justify-between items-center relative px-4">
                        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-200 -z-10"></div>
                        {[1, 2, 3, 4].map(s => {
                            let status = 'pending'; // pending, current, completed
                            if (activeSubmission) {
                                const subStatus = activeSubmission.status as any;
                                if (subStatus === 'final_provided') status = 'completed';
                                else if (s === 1) status = 'completed';
                                else if (s === 2 && ['preliminary_provided', 'report_submitted'].includes(subStatus)) status = 'completed';
                                else if (s === 3 && ['report_submitted'].includes(subStatus)) status = 'completed';
                                else if (s === 4 && subStatus === 'final_provided') status = 'completed';
                                
                                // Current logic approximation
                                if (status !== 'completed') {
                                    if (s === 1 && subStatus === 'new') status = 'completed';
                                    if (s === 2 && subStatus === 'new') status = 'current';
                                    if (s === 3 && subStatus === 'preliminary_provided') status = 'current';
                                    if (s === 4 && subStatus === 'report_submitted') status = 'current';
                                }
                            } else {
                                if (s === 1) status = 'current';
                            }

                            return (
                                <div key={s} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 transition-colors ${status === 'completed' ? 'bg-green-600 border-green-600 text-white' : status === 'current' ? 'bg-white border-blue-600 text-blue-600' : 'bg-white border-slate-200 text-slate-300'}`}>
                                    {status === 'completed' ? <Check size={16} /> : s}
                                </div>
                            )
                        })}
                    </div>

                    {!activeSubmission ? (
                        // Step 1: Initial Submission
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">提交专家诊断申请</h2>
                            <p className="text-slate-500 mb-6">请详细描述您遇到的问题，并上传相关背景资料。我们的专家团队将在24小时内为您提供初步分析。</p>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">问题描述</label>
                                    <textarea 
                                        className="w-full h-32 p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-slate-50"
                                        placeholder="例如：即使加薪了，核心员工依然在流失..."
                                        value={expertIssueDescription}
                                        onChange={(e) => setExpertIssueDescription(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">附件上传 (可选)</label>
                                    <div className="flex items-center gap-4">
                                        <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-all">
                                            <Upload size={24} className="text-slate-400 mb-2" />
                                            <span className="text-xs text-slate-500">点击上传</span>
                                            <input type="file" className="hidden" multiple onChange={handleInitialFileUpload} />
                                        </label>
                                        <div className="flex-1 space-y-2">
                                            {uploadedFiles.map((f, i) => (
                                                <div key={i} className="flex items-center gap-2 text-sm bg-slate-100 px-3 py-2 rounded-lg text-slate-600">
                                                    <FileText size={14} /> {f}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleStep1Submit}
                                    className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Send size={18} /> 提交申请 {isAdmin ? '(Admin)' : isPro ? '(Pro)' : ''}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Step 1 View */}
                            <div className="bg-white p-6 rounded-xl border border-slate-200 opacity-60">
                                <h3 className="font-bold text-slate-700 mb-2">1. 您的申请</h3>
                                <p className="text-slate-600 text-sm">{activeSubmission.problemDescription}</p>
                            </div>

                            {/* Step 2: Expert Reply */}
                            {(activeSubmission.status !== 'new' || isAdmin) && (
                                <div className={`bg-white p-6 rounded-xl border ${activeSubmission.status === 'new' ? 'border-blue-300 shadow-md' : 'border-slate-200'}`}>
                                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                        <span className="bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                                        专家初步回复
                                    </h3>
                                    
                                    {isAdmin && activeSubmission.status === 'new' ? (
                                        <div className="space-y-4">
                                            <textarea className="w-full border p-3 rounded" placeholder="Admin: 输入回复..." value={adminReply2} onChange={e => setAdminReply2(e.target.value)} />
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => openToolLibrary('select')} className="px-3 py-1.5 bg-slate-100 rounded text-xs font-bold">选择模版</button>
                                                <button onClick={handleStep2AdminSubmit} className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-bold">发送回复</button>
                                            </div>
                                        </div>
                                    ) : activeSubmission.expertPreliminaryReply ? (
                                        <div>
                                            <p className="text-sm text-slate-700 mb-4 leading-relaxed">{activeSubmission.expertPreliminaryReply}</p>
                                            {activeSubmission.templateFile && (
                                                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => handleDownload(activeSubmission.templateFile, '诊断模版')}>
                                                    <FileSpreadsheet size={20} className="text-green-600" />
                                                    <div className="flex-1">
                                                        <div className="font-bold text-sm text-blue-900">{activeSubmission.templateFile}</div>
                                                        <div className="text-xs text-blue-500">点击下载填写</div>
                                                    </div>
                                                    <Download size={16} className="text-blue-400" />
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 text-slate-400 text-sm"><Loader2 size={20} className="animate-spin mx-auto mb-2" /> 专家正在分析中...</div>
                                    )}
                                </div>
                            )}

                            {/* Step 3: User Report Upload */}
                            {(['preliminary_provided', 'report_submitted', 'final_provided'].includes(activeSubmission.status as any)) && (
                                <div className={`bg-white p-6 rounded-xl border ${activeSubmission.status === 'preliminary_provided' ? 'border-blue-300 shadow-md' : 'border-slate-200'}`}>
                                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                        <span className="bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                                        提交诊断数据
                                    </h3>
                                    
                                    {activeSubmission.status === 'preliminary_provided' ? (
                                        <div className="space-y-4">
                                            <textarea className="w-full border p-3 rounded text-sm bg-slate-50" placeholder="补充说明 (可选)..." value={userReportDesc} onChange={e => setUserReportDesc(e.target.value)} />
                                            
                                            {selectedReportFile ? (
                                                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl">
                                                    <div className="flex items-center gap-3">
                                                        <FileCheck size={24} className="text-green-600" />
                                                        <div>
                                                            <div className="text-sm font-bold text-slate-800">{selectedReportFile.name}</div>
                                                            <div className="text-xs text-slate-500">{(selectedReportFile.size / 1024).toFixed(1)} KB</div>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setSelectedReportFile(null)} className="text-slate-400 hover:text-red-500 p-1"><X size={18} /></button>
                                                </div>
                                            ) : (
                                                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleStep3FileSelect} />
                                                    <Upload className="mx-auto text-slate-400 mb-2" />
                                                    <p className="text-sm text-slate-600">点击上传填写好的报告</p>
                                                </div>
                                            )}

                                            <button 
                                                onClick={handleStep3ConfirmSubmit}
                                                disabled={!selectedReportFile || isSubmittingFile}
                                                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isSubmittingFile ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                                确认提交报告
                                            </button>
                                        </div>
                                    ) : (
                                        <div 
                                            className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 border border-slate-200 transition-colors" 
                                            onClick={() => handleDownload(activeSubmission.userReportFile || 'user_report.xlsx', '我的报告')}
                                        >
                                            <FileCheck size={20} className="text-purple-600" />
                                            <div className="flex-1">
                                                <div className="text-sm font-bold text-slate-700">已提交报告</div>
                                                <div className="text-xs text-slate-500">{activeSubmission.userReportFile || 'file.xlsx'}</div>
                                            </div>
                                            <Download size={16} className="text-slate-400" />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step 4: Final */}
                            {(['report_submitted', 'final_provided'].includes(activeSubmission.status as any) || isAdmin) && (
                                <div className={`bg-white p-6 rounded-xl border ${activeSubmission.status === 'report_submitted' ? 'border-blue-300 shadow-md' : 'border-slate-200'}`}>
                                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                        <span className="bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">4</span>
                                        最终诊断方案
                                    </h3>
                                    
                                    {isAdmin && activeSubmission.status === 'report_submitted' ? (
                                        <div className="space-y-4">
                                            <textarea className="w-full border p-3 rounded" placeholder="Admin: 输入最终方案..." value={adminReply4} onChange={e => setAdminReply4(e.target.value)} />
                                            
                                            {/* Admin File Upload for Final Solution */}
                                            <div className="flex items-center gap-3">
                                                <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors">
                                                    <Upload size={14} /> 上传最终方案
                                                    <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && setStep4File(e.target.files[0])} />
                                                </label>
                                                <span className="text-xs text-slate-500">{step4File?.name || '未选择文件'}</span>
                                            </div>

                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleStep4AdminSubmit()} className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-bold">发送方案</button>
                                            </div>
                                        </div>
                                    ) : (activeSubmission.status as any) === 'final_provided' ? (
                                        <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                            <div className="flex items-center gap-2 text-green-800 font-bold mb-2"><Sparkles size={16} /> 诊断完成</div>
                                            <p className="text-sm text-green-700 mb-4">{activeSubmission.expertFinalReply}</p>
                                            {activeSubmission.expertFinalFile && (
                                                <button 
                                                    onClick={() => handleDownload(activeSubmission.expertFinalFile, '最终方案')}
                                                    className="w-full py-2 bg-white border border-green-200 text-green-700 rounded-lg text-sm font-bold shadow-sm hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <Download size={16} /> 下载完整方案报告
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 text-slate-400 text-sm">专家正在制定最终方案...</div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Modals */}
        {/* Resource Selector Modal for Admin */}
        {showResourceModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70] animate-in fade-in">
                <div className="bg-white rounded-xl w-full max-w-lg p-6 animate-in zoom-in-95">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold">选择资源</h3>
                        <button onClick={() => setShowResourceModal(false)}><X size={20} /></button>
                    </div>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                        {knowledgeCategories.flatMap(c => c.items).map((item, i) => (
                            <div key={i} onClick={() => handleTemplateSelect(item.title)} className="p-3 border rounded hover:bg-blue-50 cursor-pointer flex items-center justify-between">
                                <span>{item.title}</span>
                                <span className="text-xs text-slate-400">{item.type}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* Payment Gate Modal */}
        {showPaymentGate && (
            <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-white rounded-2xl w-full max-w-sm p-8 text-center animate-in zoom-in-95">
                    <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Crown size={32} className="fill-current" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">升级到专业版</h3>
                    <p className="text-slate-500 text-sm mb-6">专家人工诊断是 PRO 会员专属权益。请升级您的计划以继续。</p>
                    <div className="space-y-3">
                        <button onClick={() => navigate(AppRoute.PLANS)} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-black">
                            查看订阅计划
                        </button>
                        <button onClick={() => setShowPaymentGate(false)} className="w-full py-3 text-slate-500 font-bold rounded-xl hover:bg-slate-50">
                            暂不升级
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default Diagnosis;