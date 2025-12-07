import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppRoute, DiagnosisSubmission, User, UserUpload, KnowledgeCategory, KnowledgeItem } from '../types';
import { getKnowledgeCategories } from '../services/resourceService';
import { saveUserUpload, getDiagnosisSubmissions, saveDiagnosisSubmission } from '../services/userDataService';
import { hasPermission } from '../services/permissionService';
import { tingWuService } from '../services/tingwuService';
import {
  ArrowRight, Send, Loader2, RotateCcw, Sparkles,
  FileText, Download, Upload, FileCheck, Mail, CheckCircle,
  X, FileSpreadsheet, Presentation, BookOpen, File, Copy, Check, Lock, Crown,
  PenTool, MessageSquare, Stethoscope, Video, Mic, StopCircle, Radio, Camera, LayoutTemplate, Settings,
  Smartphone, Monitor, Tablet, Square as SquareIcon, MessageCircle, Clock, AlertCircle, FolderOpen,
  Ratio, Grid, Bot, Disc, Wifi, WifiOff
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  action?: 'switch_to_expert';
}

// 阿里云通义听悟版本的诊断组件
const DiagnosisTingWu: React.FC = () => {
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
  const [selectedReportFile, setSelectedReportFile] = useState<File | null>(null);

  // Inputs for Steps
  const [userReportDesc, setUserReportDesc] = useState('');
  const [adminReply2, setAdminReply2] = useState('');
  const [adminReply4, setAdminReply4] = useState('');
  const [step4File, setStep4File] = useState<File | null>(null);

  // Interview Mode State (阿里云通义听悟版本)
  const [interviewMode, setInterviewMode] = useState<'ai' | 'video'>('ai');
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecordedVideo, setHasRecordedVideo] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '1:1'>('16:9');
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptionRef = useRef<string>('');
  const aiInterviewQuestionRef = useRef<string>("你好！我是阿里云AI诊断官。请点击红色按钮开始录制，我会通过实时语音与您互动，深入了解您的需求。");

  // Modals State
  const [showPaymentGate, setShowPaymentGate] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [resourceModalMode, setResourceModalMode] = useState<'download' | 'select'>('download');
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
      let mySub: DiagnosisSubmission | undefined;
      if (user.role === 'admin') {
        mySub = submissions[0];
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
    stopTingWuSession();

    return () => {
      stopCamera();
      stopTingWuSession();
    };
  }, []);

  // 配置阿里云通义听悟服务
  useEffect(() => {
    tingWuService.config.onConnectionStatus = (status, message) => {
      setConnectionStatus(status);
      setConnectionMessage(message || '');

      if (status === 'connected') {
        aiInterviewQuestionRef.current = "已连接成功！我是您的AI诊断官，请开始描述您遇到的问题...";
      } else if (status === 'error') {
        aiInterviewQuestionRef.current = "连接失败，请检查网络配置或稍后重试。";
      }
    };

    tingWuService.config.onTranscriptionResult = (text, isFinal) => {
      if (isFinal) {
        transcriptionRef.current += (transcriptionRef.current ? ' ' : '') + text;
        // 这里可以添加AI回复逻辑
        if (text.includes('结束') || text.includes('完成')) {
          aiInterviewQuestionRef.current = "感谢您的分享，我已记录您的问题。让我们继续深入了解...";
        }
      }
    };

    tingWuService.config.onAIResponse = (response) => {
      aiInterviewQuestionRef.current = response;
    };

    tingWuService.config.onError = (error) => {
      console.error('阿里云通义听悟错误:', error);
      setConnectionStatus('error');
      setConnectionMessage(error.message);
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
      setExpertIssueDescription(initialIssue);
      const issues = getDiagnosisIssuesContent();
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

  // 相机和阿里云通义听悟相关方法
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: true
      });
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

  const startTingWuSession = async () => {
    try {
      const success = await tingWuService.startSession();
      return success;
    } catch (error) {
      console.error("启动阿里云通义听悟失败:", error);
      return false;
    }
  };

  const stopTingWuSession = async () => {
    try {
      await tingWuService.stopSession();
    } catch (error) {
      console.error("停止阿里云通义听悟失败:", error);
    }
  };

  const handleModeSwitch = (mode: 'ai' | 'video') => {
    if (isRecording) return;
    setInterviewMode(mode);
    setHasRecordedVideo(false);
    if (mode === 'video') {
      aiInterviewQuestionRef.current = "准备就绪。点击录制按钮开始录制视频。";
    } else {
      aiInterviewQuestionRef.current = "你好！我是阿里云AI诊断官。请点击红色按钮开始录制，我会通过实时语音与您互动，深入了解您的需求。";
    }
  };

  const handleRecordToggle = async () => {
    if (isRecording) {
      // 停止录制
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      if (interviewMode === 'ai') {
        await stopTingWuSession();
      }

      stopCamera();
      setIsRecording(false);
      aiInterviewQuestionRef.current = interviewMode === 'ai' ? "访谈已结束。您可以下载视频或点击红色按钮重新开始。" : "录制已完成。您可以点击下方按钮下载视频。";
    } else {
      // 开始录制
      const success = await startCamera();
      if (!success) return;

      setHasRecordedVideo(false);
      await new Promise(r => setTimeout(r, 500));

      if (streamRef.current) {
        let options: MediaRecorderOptions = { mimeType: 'video/webm' };
        if (MediaRecorder.isTypeSupported('video/mp4')) options = { mimeType: 'video/mp4' };

        const recorder = new MediaRecorder(streamRef.current, options);
        recordedChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          setHasRecordedVideo(true);
        };

        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);

        if (interviewMode === 'ai') {
          const tingwuSuccess = await startTingWuSession();
          if (!tingwuSuccess) {
            aiInterviewQuestionRef.current = "❌ 阿里云通义听悟连接失败，请检查配置或网络。";
          }
        } else {
          aiInterviewQuestionRef.current = "正在录制视频... (仅本地录制)";
        }
      }
    }
  };

  const handleDownloadVideo = () => {
    if (recordedChunksRef.current.length === 0) { alert("暂无录制内容"); return; }
    const type = recordedChunksRef.current[0]?.type || 'video/webm';
    const blob = new Blob(recordedChunksRef.current, { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview_${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // ... 其他方法保持不变 ...

  const getDiagnosisIssuesContent = () => {
    return [
      {
        title: '人员流失',
        userText: '我们的核心员工最近流失严重',
        aiResponse: '人员流失确实是呼叫中心的痛点。请问您观察到流失主要集中在哪些岗位？是客服代表还是技术支持？'
      }
      // ... 其他问题
    ];
  };

  const isAdmin = currentUser?.role === 'admin';
  const isPro = currentUser?.plan === 'pro' || isAdmin;

  return (
    <div className="h-full flex flex-col bg-white relative">
      {/* Header保持不变 */}
      <header className="bg-white border-b border-slate-200 pt-4 px-6 pb-0 sticky top-0 z-10 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="text-2xl">🧭</span> 诊断罗盘 (阿里云版)
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

        <div className="flex gap-8 overflow-x-auto">
           <button onClick={() => setActiveTab('ai')} className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'ai' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'}`}>AI 智能诊断</button>
           <button onClick={() => setActiveTab('interview')} className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 whitespace-nowrap ${activeTab === 'interview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'}`}>
             <Video size={14} className="mb-0.5" /> 阿里云AI视频访谈
           </button>
           <button onClick={() => setActiveTab('expert')} className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 whitespace-nowrap ${activeTab === 'expert' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'}`}>
              专家人工诊断
              {!hasPermission(currentUser, 'expert_diagnosis') && <Lock size={12} className="mb-0.5" />}
           </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">

        {/* AI Chat Tab保持不变 */}
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
             </div>
          </div>
        )}

        {/* Interview Tab - 阿里云版本 */}
        {activeTab === 'interview' && (
            <div className="absolute inset-0 flex flex-col md:flex-row">
               {/* Left: Video Area */}
               <div className="w-full md:w-1/2 bg-black relative flex flex-col items-center justify-center p-4">

                   <div className="w-full max-w-lg mb-6 flex flex-col gap-4">
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
                                阿里云AI访谈
                            </button>
                       </div>

                       <div className="flex justify-between items-end">
                           <div>
                               <h3 className="text-white font-bold text-lg mb-1 flex items-center gap-2">
                                   {interviewMode === 'ai' ? <Wifi size={20} className="text-indigo-400" /> : <Video size={20} className="text-blue-500" />}
                                   {interviewMode === 'ai' ? '阿里云AI智能访谈' : '视频需求录制'}
                               </h3>
                               <p className="text-slate-400 text-xs max-w-xs leading-relaxed">
                                   {interviewMode === 'ai'
                                     ? '阿里云通义听悟 + 通义千问，低延迟实时对话。'
                                     : '像与真人聊天一样，通过视频口述您的需求。'}
                               </p>
                           </div>
                           <div className="flex items-center gap-2">
                               <div className={`px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                                   connectionStatus === 'connected' ? 'bg-green-600 text-white' :
                                   connectionStatus === 'connecting' ? 'bg-yellow-600 text-white animate-pulse' :
                                   connectionStatus === 'error' ? 'bg-red-600 text-white' : 'bg-slate-600 text-white'
                               }`}>
                                   {connectionStatus === 'connected' ? <Wifi size={12} /> :
                                    connectionStatus === 'connecting' ? <Loader2 size={12} className="animate-spin" /> :
                                    connectionStatus === 'error' ? <WifiOff size={12} /> : <WifiOff size={12} />}
                                   {connectionStatus === 'connected' ? '已连接' :
                                    connectionStatus === 'connecting' ? '连接中' :
                                    connectionStatus === 'error' ? '连接失败' : '未连接'}
                               </div>
                           </div>
                       </div>
                   </div>

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
               <div className="w-full md:w-1/2 bg-gradient-to-br from-indigo-900 to-blue-900 text-white p-8 flex flex-col justify-center items-center text-center border-l border-slate-800">
                   <div className={`w-32 h-32 rounded-full mb-8 flex items-center justify-center transition-all duration-500 ${
                     connectionStatus === 'connected' || (interviewMode === 'video' && isRecording)
                       ? 'bg-blue-600 shadow-[0_0_40px_rgba(37,99,235,0.5)] animate-pulse'
                       : 'bg-slate-800'
                   }`}>
                       {interviewMode === 'ai' ? (
                           connectionStatus === 'connected' ? <Wifi size={48} className="text-white" /> : <WifiOff size={48} className="text-slate-600" />
                       ) : (
                           isRecording ? <Disc size={48} className="text-white animate-spin" /> : <Video size={48} className="text-slate-600" />
                       )}
                   </div>

                   <h3 className="text-2xl font-bold mb-4">
                       {interviewMode === 'ai' ? '阿里云AI诊断官' : '视频录制'}
                   </h3>

                   <div className={`text-lg leading-relaxed max-w-md transition-opacity duration-500 ${connectionStatus === 'connected' || isRecording ? 'text-blue-200' : 'text-slate-400'}`}>
                       "{aiInterviewQuestionRef.current}"
                   </div>

                   {connectionMessage && (
                       <div className={`mt-4 text-sm p-3 rounded-lg ${
                         connectionStatus === 'connecting' ? 'bg-yellow-500/20 text-yellow-200' :
                         connectionStatus === 'error' ? 'bg-red-500/20 text-red-200' :
                         'bg-green-500/20 text-green-200'
                       }`}>
                         {connectionMessage}
                       </div>
                   )}

                   {!connectionStatus || connectionStatus === 'disconnected' ? (
                       <p className="mt-8 text-sm text-slate-400 flex items-center gap-2">
                           <AlertCircle size={14} /> 请点击左侧录制按钮开始{interviewMode === 'ai' ? 'AI对话' : '录制'}
                       </p>
                   ) : null}
               </div>
            </div>
        )}

        {/* Expert Tab保持不变 */}
        {activeTab === 'expert' && (
            <div className="absolute inset-0 overflow-y-auto bg-slate-50 p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center py-12">
                        <h2 className="text-2xl font-bold text-slate-800 mb-4">专家诊断服务</h2>
                        <p className="text-slate-600">此功能需要配置相应的权限和数据模型。</p>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default DiagnosisTingWu;