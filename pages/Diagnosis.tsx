import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppRoute, KnowledgeCategory, UserUpload, User, KnowledgeItem, DiagnosisSubmission } from '../types';
import { 
  ArrowRight, Send, Loader2, RotateCcw, Sparkles,
  FileText, Download, Upload, FileCheck, Mail, CheckCircle,
  X, FileSpreadsheet, Presentation, BookOpen, File, Copy, Check, Lock, Crown,
  PenTool, MessageSquare, Stethoscope, Video, Mic, StopCircle, Radio, Camera, LayoutTemplate, Settings,
  Smartphone, Monitor, Tablet, Square as SquareIcon, MessageCircle, Clock, AlertCircle, FolderOpen
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

// Helper Component for Knowledge Base Items
const ResourceItem: React.FC<{ title: string; type: 'xlsx' | 'pdf' | 'ppt' | 'doc'; size: string; locked?: boolean; onClick?: () => void }> = ({ title, type, size, locked, onClick }) => {
  const getIcon = () => {
    switch(type) {
      case 'xlsx': return <FileSpreadsheet size={20} className="text-green-600" />;
      case 'pdf': return <FileText size={20} className="text-red-500" />;
      case 'ppt': return <Presentation size={20} className="text-orange-500" />;
      default: return <File size={20} className="text-blue-500" />;
    }
  };
  
  return (
    <div 
      onClick={locked ? undefined : onClick}
      className={`flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-white transition-all ${locked ? 'opacity-80 cursor-not-allowed' : 'hover:border-blue-300 hover:bg-blue-50 cursor-pointer group'}`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 bg-slate-50 rounded border border-slate-100 flex items-center justify-center shadow-sm transition-colors ${!locked ? 'group-hover:bg-white' : ''}`}>
           {getIcon()}
        </div>
        <div>
          <div className={`text-sm font-medium text-slate-700 transition-colors ${!locked ? 'group-hover:text-blue-700' : ''}`}>{title}</div>
          <div className="text-xs text-slate-400 uppercase flex items-center gap-1">
            <span className="font-semibold">{type}</span>
            <span>•</span>
            <span>{size}</span>
          </div>
        </div>
      </div>
      <div className={`w-8 h-8 flex items-center justify-center rounded-full text-slate-300 transition-all ${!locked ? 'group-hover:bg-blue-100 group-hover:text-blue-600' : ''}`}>
        {locked ? <Lock size={16} className="text-slate-400" /> : <Download size={16} />}
      </div>
    </div>
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
  const [isSubmittingFile, setIsSubmittingFile] = useState(false);
  
  // Inputs for Steps
  const [userReportDesc, setUserReportDesc] = useState('');
  const [adminReply2, setAdminReply2] = useState('');
  const [adminReply4, setAdminReply4] = useState('');
  
  // Interview Mode State
  const [isRecording, setIsRecording] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [aiInterviewQuestion, setAiInterviewQuestion] = useState("你好！我是 AI 面试官。请点击左侧红色按钮开始录制，我会通过实时语音与您互动，深入了解您的需求。");
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [videoAspectRatio, setVideoAspectRatio] = useState<string>('16/9');
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
    const apiKey = process.env.API_KEY;
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
          onopen: () => {
            setIsLiveConnected(true);
            setAiInterviewQuestion("我们连接成功了！请告诉我，您现在管理团队时，最担心的一件事是什么？");
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
          },
          onmessage: (msg: LiveServerMessage) => {
            if (msg.serverContent?.outputTranscription) {
               const text = msg.serverContent.outputTranscription.text;
               if (text) setAiInterviewQuestion(prev => (prev.endsWith('？') || prev.endsWith('。') || prev.includes("请点击") || prev.includes("录制") || prev.includes("注意")) ? text : prev + text);
            }
          },
          onclose: () => setIsLiveConnected(false),
          onerror: (err) => { console.error("Gemini Live Error", err); setIsLiveConnected(false); }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: { model: "gemini-2.5-flash" },
          systemInstruction: `You are a professional, empathetic, and slightly charismatic Video Podcast Host interviewing a Call Center Manager. 
          Your goal is to help them articulate their operational problems.
          1. Ask SHORT, concise, open-ended questions (1-2 sentences max).
          2. Listen to their answer, acknowledge it briefly, and ask a follow-up.
          3. Do NOT provide solutions yet. Just dig deeper into the problem.
          4. Actively listen.
          5. Keep the tone elegant and professional.`,
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

  const handleRecordToggle = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') { mediaRecorderRef.current.stop(); }
      stopLiveSession(); stopCamera(); setIsRecording(false);
      setAiInterviewQuestion("访谈已结束。您可以下载视频或点击红色按钮重新开始。");
    } else {
      const success = await startCamera();
      if (!success) return;
      await new Promise(r => setTimeout(r, 500));
      if (streamRef.current) {
          let options: MediaRecorderOptions = { mimeType: 'video/webm' };
          if (MediaRecorder.isTypeSupported('video/mp4')) options = { mimeType: 'video/mp4' };
          const recorder = new MediaRecorder(streamRef.current, options);
          recordedChunksRef.current = [];
          recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
          recorder.start();
          mediaRecorderRef.current = recorder;
          setIsRecording(true);
          await startLiveSession();
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

  const handleStep3Upload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      
      setIsSubmittingFile(true);
      setTimeout(() => {
          if (activeSubmission) {
              const updated: DiagnosisSubmission = { 
                  ...activeSubmission, 
                  userReportFile: file ? file.name : activeSubmission.userReportFile,
                  userReportDescription: userReportDesc,
                  status: 'report_submitted' 
              };
              setActiveSubmission(updated);
              saveDiagnosisSubmission(updated);
          }
          setIsSubmittingFile(false);
      }, 1000);
  };

  const handleStep4AdminSubmit = (file?: File) => {
      if (!activeSubmission) return;
      const updated: DiagnosisSubmission = {
          ...activeSubmission,
          expertFinalReply: adminReply4,
          expertFinalFile: file ? file.name : activeSubmission.expertFinalFile,
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
                          {msg.sender === 'ai' && <CopyButton text={msg.text} />}
                          {msg.action === 'switch_to_expert' && (
                             <button onClick={() => setActiveTab('expert')} className="mt-3 text-blue-600 underline hover:text-blue-800 text-xs font-bold flex items-center gap-1 bg-blue-50 p-2 rounded-lg transition-colors w-fit"><Stethoscope size={14} /> 专家人工诊断通道</button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isTyping && (<div className="flex justify-start"><div className="flex gap-3 max-w-[80%]"><div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white"><span className="text-lg">⚓</span></div><div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-2"><Loader2 size={16} className="animate-spin text-blue-600" /><span className="text-xs text-slate-400">大副正在思考...</span></div></div></div>)}
                  <div ref={messagesEndRef} />
                </div>
             </div>
             <div className="p-4 bg-white border-t border-slate-200">
                <div className="max-w-3xl mx-auto relative flex items-center gap-2">
                  {step > 0 && step < 100 && (<button onClick={restartDiagnosis} title="重新开始" className="p-3 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"><RotateCcw size={20} /></button>)}
                  {messages.length > 1 && step < 100 && (<button onClick={handleSummarize} disabled={isTyping} title="生成摘要" className="p-3 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors disabled:opacity-50"><Sparkles size={20} /></button>)}
                  <div className="relative flex-1">
                    <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder={step >= 100 ? "诊断已完成。请点击上方获取方案。" : "请在此输入您的回答..."} disabled={step >= 100 || isTyping} className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50" />
                    <button onClick={handleSend} disabled={!input.trim() || step >= 100 || isTyping} className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"><Send size={20} /></button>
                  </div>
                </div>
             </div>
          </div>
        )}

        {/* --- TAB 2: Interview (Keep existing UI) --- */}
        {activeTab === 'interview' && (
           <div className="absolute inset-0 flex flex-col md:flex-row bg-white">
               <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 bg-white p-6 flex flex-col z-10 shadow-sm overflow-y-auto">
                   <div className="mb-8"><h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-2"><Camera className="text-blue-600" size={24} /> 视频需求录制</h2><p className="text-slate-500 text-sm leading-relaxed">像与真人聊天一样，通过视频口述您的需求。AI 将引导您理清思路。</p></div>
                   <div className="mb-8"><h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1"><LayoutTemplate size={14} /> 视频比例</h3><div className="grid grid-cols-2 gap-3">
                       {['9/16', '16/9', '3/4', '1/1'].map(r => (
                           <button key={r} onClick={() => setVideoAspectRatio(r)} className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all border ${videoAspectRatio === r ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>{r === '9/16' ? <Smartphone size={16} /> : r === '16/9' ? <Monitor size={16} /> : r === '3/4' ? <Tablet size={16} /> : <SquareIcon size={16} />} {r.replace('/', ':')}</button>
                       ))}
                   </div></div>
                   <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-8"><div className="flex items-center gap-2 text-blue-700 font-bold text-sm mb-2"><Sparkles size={16} /> AI 访谈助手</div><p className="text-blue-900/70 text-xs leading-relaxed">AI将实时倾听您的描述，并以文字气泡的形式提出引导性问题。</p></div>
                   <div className="mt-auto pb-4">
                       {!isRecording ? (<button onClick={handleRecordToggle} className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2 group"><div className="w-3 h-3 bg-white rounded-full animate-pulse"></div> 开始录制访谈</button>) : (<button onClick={handleRecordToggle} className="w-full py-3.5 bg-white border border-slate-200 text-red-600 hover:bg-red-50 rounded-xl font-bold transition-all flex items-center justify-center gap-2"><div className="w-3 h-3 bg-red-600 rounded-sm"></div> 停止录制</button>)}
                       {recordedChunksRef.current.length > 0 && !isRecording && (<button onClick={handleDownloadVideo} className="w-full py-3 mt-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-bold transition-all flex items-center justify-center gap-2"><Download size={16} /> 下载视频 (.mp4)</button>)}
                   </div>
               </div>
               <div className="flex-1 bg-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
                   <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]"></div>
                   <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black ring-8 ring-white w-full max-w-3xl transition-all duration-500" style={{ aspectRatio: videoAspectRatio.replace(':', '/') }}>
                       <video ref={videoRef} className="w-full h-full object-cover transform scale-x-[-1]" autoPlay={isCameraActive} muted playsInline />
                       {!isRecording && !isCameraActive && !streamRef.current && (<div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center text-center z-10 p-6"><div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4"><Camera size={32} className="text-white/50" /></div><h3 className="text-white font-bold text-lg mb-1">准备就绪</h3><p className="text-slate-400 text-sm">请点击左侧“开始录制”按钮</p></div>)}
                       {isRecording && (<div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 bg-red-600/90 backdrop-blur rounded-full z-20"><div className="w-2 h-2 bg-white rounded-full animate-ping"></div><span className="text-white text-[10px] font-bold tracking-wider">REC</span></div>)}
                       <div className="absolute bottom-8 left-8 right-8 z-20"><div className="flex items-end gap-3 animate-in slide-in-from-bottom-4 fade-in duration-500"><div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg flex-shrink-0 border-2 border-white"><Sparkles size={20} /></div><div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl rounded-bl-none shadow-xl border border-white/50 max-w-[80%]"><div className="text-xs font-bold text-blue-600 mb-1">AI 访谈助手</div><p className="text-slate-800 font-medium text-sm md:text-base leading-snug">{aiInterviewQuestion}</p></div></div></div>
                   </div>
                   <div className="absolute top-6 right-6 flex items-center gap-3"><div className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border ${isLiveConnected ? 'bg-green-500/10 border-green-500/20 text-green-600' : 'bg-slate-200/50 border-slate-300/50 text-slate-500'}`}><div className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></div><span className="text-xs font-bold uppercase">{isLiveConnected ? 'AI Online' : 'AI Offline'}</span></div></div>
               </div>
           </div>
        )}

        {/* --- TAB 3: Expert Workflow (Updated) --- */}
        {activeTab === 'expert' && (
          <div className="absolute inset-0 overflow-y-auto bg-slate-50 p-6 md:p-12">
            <div className="max-w-3xl mx-auto space-y-8">
              <div className="text-center mb-10">
                <h2 className="text-2xl font-bold text-slate-900">深度人工诊断服务</h2>
                <p className="text-slate-500 mt-2">复杂问题交由行业专家，4步获取定制化改善方案。</p>
              </div>

              {/* Step 1: Submission */}
              <div className={`bg-white rounded-xl border transition-all duration-300 p-6 relative ${activeSubmission ? 'border-blue-200 shadow-none opacity-80' : 'border-slate-200 shadow-md'}`}>
                 <div className="flex items-start gap-4">
                     <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold ${activeSubmission ? 'bg-blue-100 text-blue-600' : 'bg-blue-600 text-white'}`}>1</div>
                     <div className="flex-1">
                         <h3 className="text-lg font-bold text-slate-800 mb-2">Step 1: 提交问题与资料</h3>
                         {activeSubmission ? (
                             <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-600">
                                 <p className="font-bold mb-1 text-slate-800">已提交问题:</p>
                                 <p className="mb-3">"{activeSubmission.problemDescription}"</p>
                                 <p className="text-xs text-slate-400">提交时间: {activeSubmission.submittedAt}</p>
                             </div>
                         ) : (
                             <div className="space-y-4">
                                 <textarea 
                                    value={expertIssueDescription}
                                    onChange={(e) => setExpertIssueDescription(e.target.value)}
                                    className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                                    placeholder="请详细描述您遇到的问题..."
                                 />
                                 <div className="flex flex-wrap gap-2">
                                     <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-600 transition-colors">
                                         <Upload size={14} /> 上传辅助文档 (PDF/Word/Excel)
                                         <input type="file" multiple className="hidden" onChange={handleInitialFileUpload} />
                                     </label>
                                     {uploadedFiles.map((f, i) => <span key={i} className="px-2 py-2 bg-white border rounded text-xs flex items-center gap-1"><File size={12} /> {f}</span>)}
                                 </div>
                                 <button onClick={handleStep1Submit} disabled={!expertIssueDescription.trim()} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 disabled:opacity-50">提交诊断申请</button>
                             </div>
                         )}
                     </div>
                 </div>
              </div>

              {/* Step 2: Preliminary Reply & Template */}
              <div className={`bg-white rounded-xl border transition-all duration-300 p-6 relative ${(!activeSubmission || activeSubmission.status === 'new') ? 'opacity-50 grayscale' : 'border-slate-200 shadow-md'}`}>
                 <div className="flex items-start gap-4">
                     <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold ${activeSubmission?.status === 'preliminary_provided' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-400'}`}>2</div>
                     <div className="flex-1">
                         <h3 className="text-lg font-bold text-slate-800 mb-2">Step 2: 专家初步反馈 & 模版下载</h3>
                         {(activeSubmission?.status !== 'new' && activeSubmission) || isAdmin ? (
                             <div className="space-y-4 animate-in fade-in">
                                 
                                 {/* Admin Input Mode */}
                                 {isAdmin && (
                                     <div className="mb-4 p-4 bg-orange-50 border border-orange-100 rounded-lg space-y-3">
                                         <h4 className="text-xs font-bold text-orange-800 uppercase">专家操作区</h4>
                                         <textarea 
                                            value={adminReply2}
                                            onChange={(e) => setAdminReply2(e.target.value)}
                                            className="w-full p-3 border border-orange-200 rounded text-sm focus:ring-2 focus:ring-orange-500 outline-none h-24 bg-white"
                                            placeholder="输入初步诊断回复..."
                                         />
                                         <div className="flex justify-between items-center">
                                             <button onClick={() => openToolLibrary('select')} className="text-xs font-bold text-orange-700 flex items-center gap-1 hover:underline">
                                                 <FolderOpen size={14} /> 选择推荐工具模版
                                             </button>
                                             <button onClick={handleStep2AdminSubmit} className="px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded hover:bg-orange-700">发送回复</button>
                                         </div>
                                     </div>
                                 )}

                                 <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg text-sm text-slate-700">
                                     <span className="font-bold block mb-2 text-blue-800">专家回复:</span>
                                     {activeSubmission?.expertPreliminaryReply || "专家正在分析中..."}
                                 </div>
                                 
                                 {activeSubmission?.templateFile && (
                                     <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer group" onClick={() => alert('下载 ' + activeSubmission?.templateFile)}>
                                         <FileSpreadsheet className="text-green-600" size={24} />
                                         <div>
                                             <div className="font-bold text-sm text-slate-800">{activeSubmission.templateFile}</div>
                                             <div className="text-xs text-slate-400">点击下载诊断模版</div>
                                         </div>
                                         <Download className="ml-auto text-slate-300 group-hover:text-blue-600" size={18} />
                                     </div>
                                 )}

                                 {/* Pro User Self-Service */}
                                 {isPro && !isAdmin && (
                                     <button 
                                        onClick={() => openToolLibrary('download')}
                                        className="mt-2 w-full py-2 border border-dashed border-slate-300 text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all"
                                     >
                                         <Crown size={14} className="text-yellow-500" /> PRO 会员特权：直接浏览工具库下载
                                     </button>
                                 )}
                             </div>
                         ) : (
                             <p className="text-sm text-slate-400">等待专家受理...</p>
                         )}
                     </div>
                 </div>
              </div>

              {/* Step 3: Upload Report */}
              <div className={`bg-white rounded-xl border transition-all duration-300 p-6 relative ${(activeSubmission?.status === 'new' || activeSubmission?.status === 'preliminary_provided') ? '' : 'opacity-80'}`}>
                 <div className="flex items-start gap-4">
                     <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold ${activeSubmission?.status === 'preliminary_provided' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-400'}`}>3</div>
                     <div className="flex-1">
                         <h3 className="text-lg font-bold text-slate-800 mb-2">Step 3: 上传填写后的报告</h3>
                         {(activeSubmission?.status === 'preliminary_provided' || activeSubmission?.status === 'report_submitted') ? (
                             <div className="mt-4 space-y-4">
                                 {!activeSubmission.userReportFile ? (
                                     <>
                                        <textarea 
                                            value={userReportDesc}
                                            onChange={(e) => setUserReportDesc(e.target.value)}
                                            className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none h-24 resize-none"
                                            placeholder="在此输入报告说明或备注..."
                                        />
                                        <label className="w-full border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors">
                                            {isSubmittingFile ? <Loader2 className="animate-spin text-purple-600" size={24} /> : <Upload className="text-slate-400" size={24} />}
                                            <span className="text-sm font-bold text-slate-600 mt-2">{isSubmittingFile ? '上传中...' : '点击上传报告文件 (支持所有格式)'}</span>
                                            <span className="text-xs text-slate-400 mt-1">支持 PDF, Word, Excel, PPT, Zip 等</span>
                                            <input type="file" className="hidden" onChange={handleStep3Upload} disabled={isSubmittingFile} />
                                        </label>
                                        <div className="flex justify-end">
                                            <button onClick={() => handleStep3Upload({ target: { files: null } } as any)} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 flex items-center gap-2">
                                                <Send size={14} /> 提交报告
                                            </button>
                                        </div>
                                     </>
                                 ) : (
                                     <div className="p-4 bg-green-50 text-green-700 rounded-lg border border-green-100 space-y-2">
                                         <div className="flex items-center gap-2 text-sm font-bold">
                                             <CheckCircle size={16} /> 已上传: {activeSubmission.userReportFile}
                                         </div>
                                         {activeSubmission.userReportDescription && (
                                             <p className="text-xs text-slate-600 bg-white/50 p-2 rounded border border-green-100">
                                                 "{activeSubmission.userReportDescription}"
                                             </p>
                                         )}
                                     </div>
                                 )}
                             </div>
                         ) : <p className="text-sm text-slate-400">需完成上一步后开启</p>}
                     </div>
                 </div>
              </div>

              {/* Step 4: Final Plan */}
              <div className={`bg-white rounded-xl border transition-all duration-300 p-6 relative ${activeSubmission?.status === 'final_provided' ? 'border-green-200 shadow-md' : 'opacity-50 grayscale'}`}>
                 <div className="flex items-start gap-4">
                     <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold ${activeSubmission?.status === 'final_provided' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-400'}`}>4</div>
                     <div className="flex-1">
                         <h3 className="text-lg font-bold text-slate-800 mb-2">Step 4: 最终改善方案</h3>
                         
                         {/* Admin Input Mode for Step 4 */}
                         {isAdmin && (activeSubmission?.status === 'report_submitted' || activeSubmission?.status === 'final_provided') && (
                             <div className="mb-4 p-4 bg-green-50 border border-green-100 rounded-lg space-y-3">
                                 <h4 className="text-xs font-bold text-green-800 uppercase">专家操作区 (最终方案)</h4>
                                 <textarea 
                                    value={adminReply4}
                                    onChange={(e) => setAdminReply4(e.target.value)}
                                    className="w-full p-3 border border-green-200 rounded text-sm focus:ring-2 focus:ring-green-500 outline-none h-24 bg-white"
                                    placeholder="输入最终建议..."
                                 />
                                 <div className="flex justify-between items-center">
                                     <label className="text-xs font-bold text-green-700 flex items-center gap-1 hover:underline cursor-pointer">
                                         <Upload size={14} /> 上传方案文件
                                         <input type="file" className="hidden" onChange={(e) => { if(e.target.files?.[0]) handleStep4AdminSubmit(e.target.files[0]); }} />
                                     </label>
                                     <button onClick={() => handleStep4AdminSubmit()} className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700">发送最终方案</button>
                                 </div>
                             </div>
                         )}

                         {activeSubmission?.status === 'final_provided' ? (
                             <div className="space-y-4 animate-in slide-in-from-bottom-2">
                                 <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg text-sm text-slate-700">
                                     <span className="font-bold block mb-2 text-green-800">专家建议:</span>
                                     {activeSubmission.expertFinalReply}
                                 </div>
                                 {activeSubmission.expertFinalFile && (
                                     <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer group" onClick={() => alert('下载 ' + activeSubmission?.expertFinalFile)}>
                                         <Presentation className="text-blue-600" size={24} />
                                         <div>
                                             <div className="font-bold text-sm text-slate-800">{activeSubmission.expertFinalFile}</div>
                                             <div className="text-xs text-slate-400">点击下载改善计划书</div>
                                         </div>
                                         <Download className="ml-auto text-slate-300 group-hover:text-blue-600" size={18} />
                                     </div>
                                 )}
                             </div>
                         ) : <p className="text-sm text-slate-400">等待专家最终评估...</p>}
                     </div>
                 </div>
              </div>

            </div>
          </div>
        )}

      </div>
      
      {/* Resource Modal */}
      {showResourceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-slate-900">{resourceModalMode === 'select' ? '选择诊断工具模版' : '专家诊断工具箱'}</h3>
                      <button onClick={() => setShowResourceModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                      <div className="space-y-6">
                          {knowledgeCategories.filter(c => c.section === 'diagnosis_tools').map(cat => (
                              <div key={cat.id}>
                                  <h4 className={`text-sm font-bold text-${cat.color}-600 mb-3 uppercase tracking-wider flex items-center gap-2`}>
                                      <div className={`w-2 h-2 rounded-full bg-${cat.color}-500`}></div>
                                      {cat.name}
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                      {cat.items.map((item, idx) => (
                                          <ResourceItem 
                                            key={idx}
                                            title={item.title} 
                                            type={item.type} 
                                            size={item.size}
                                            locked={cat.requiredPlan === 'pro' && !hasPermission(currentUser, 'download_resources') && !isAdmin}
                                            onClick={() => {
                                                if (resourceModalMode === 'select') {
                                                    handleTemplateSelect(item.title);
                                                } else {
                                                    setDownloadedFiles(prev => [...prev, item.title]);
                                                    alert(`开始下载: ${item.title}`);
                                                }
                                            }}
                                          />
                                      ))}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Payment/Upgrade Gate Modal */}
      {showPaymentGate && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-2xl w-full max-w-md p-8 text-center shadow-2xl animate-in zoom-in-95 relative border-t-4 border-yellow-400">
                  <button onClick={() => setShowPaymentGate(false)} className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
                  <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6"><Crown size={32} className="fill-current" /></div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">升级到专业版</h3>
                  <p className="text-slate-500 mb-8 leading-relaxed">该功能仅对 PRO 会员开放。升级后您将解锁专家诊断通道、无限资源下载及高级数据分析权限。</p>
                  <div className="space-y-3">
                      <button onClick={() => { setShowPaymentGate(false); navigate(AppRoute.PLANS); }} className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-colors shadow-lg shadow-slate-900/20">立即升级</button>
                      <button onClick={() => setShowPaymentGate(false)} className="w-full py-3.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors">暂不需要</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Diagnosis;