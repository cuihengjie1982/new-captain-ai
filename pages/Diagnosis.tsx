

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppRoute, KnowledgeCategory, UserUpload, User, KnowledgeItem } from '../types';
import { 
  ArrowRight, Send, Loader2, RotateCcw, Sparkles,
  FileText, Download, Upload, FileCheck, Mail, CheckCircle,
  X, FileSpreadsheet, Presentation, BookOpen, File, Copy, Check, Lock, Crown,
  PenTool, MessageSquare, Stethoscope
} from 'lucide-react';
import { getKnowledgeCategories } from '../services/resourceService';
import { saveUserUpload } from '../services/userDataService';
import { createChatSession, sendMessageToAI } from '../services/geminiService';
import { getDiagnosisIssues as getIssuesContent } from '../services/contentService';
import { hasPermission } from '../services/permissionService';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  action?: 'switch_to_expert'; // Added action type
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

const Diagnosis: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Tabs state
  const [activeTab, setActiveTab] = useState<'ai' | 'expert'>('ai');

  // AI Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [step, setStep] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitializedRef = useRef(false);

  // Expert Mode State
  const [expertIssueDescription, setExpertIssueDescription] = useState('');
  const [expertIssueSubmitted, setExpertIssueSubmitted] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [uploadedFileName, setUploadedFileName] = useState('');
  
  // Modals State
  const [showPaymentGate, setShowPaymentGate] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [downloadedFiles, setDownloadedFiles] = useState<string[]>([]);
  
  // Knowledge Base
  const [knowledgeCategories, setKnowledgeCategories] = useState<KnowledgeCategory[]>([]);

  useEffect(() => {
     setKnowledgeCategories(getKnowledgeCategories());
     const storedUser = localStorage.getItem('captainUser');
     if (storedUser) setCurrentUser(JSON.parse(storedUser));
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
      // Auto-fill expert description if coming from Blog
      setExpertIssueDescription(initialIssue);

      // Fetch dynamic issues to find match for AI chat
      const issues = getIssuesContent();
      const foundIssue = issues.find(i => i.title === initialIssue);
      
      let userText = initialIssue;
      if (foundIssue) {
          userText = foundIssue.userText;
      } else {
          userText = initialIssue; 
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
        
        setMessages(prev => [...prev, { 
            id: Date.now().toString(), 
            sender: 'ai', 
            text: `📝 **对话摘要**：\n${summary}` 
        }]);
    } catch (e) {
        console.error(e);
         setMessages(prev => [...prev, { 
            id: Date.now().toString(), 
            sender: 'ai', 
            text: "抱歉，生成摘要时出现错误，请稍后再试。" 
        }]);
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

  // --- Expert Mode Handlers ---

  const handleSubmitIssue = () => {
    if(!expertIssueDescription.trim()) return;
    setExpertIssueSubmitted(true);
    // In a real app, this would send to backend
  };

  const handleOpenResourceModal = () => {
    if (!hasPermission(currentUser, 'download_resources')) {
        setShowPaymentGate(true);
    } else {
        setShowResourceModal(true);
    }
  };

  const handleResourceDownload = (item: KnowledgeItem) => {
    // Simulate download
    setDownloadedFiles(prev => [...prev, item.title]);
    // Close modal after a short delay or keep open
    // For UX, maybe show a toast, here just auto-close to simulate action
    setTimeout(() => {
        setShowResourceModal(false);
        alert(`文件 “${item.title}” 已开始下载`);
    }, 500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!hasPermission(currentUser, 'expert_diagnosis')) {
        setShowPaymentGate(true);
        return;
    }

    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      setUploadStatus('uploading');
      
      const currentUserData = JSON.parse(localStorage.getItem('captainUser') || '{}');

      setTimeout(() => {
        setUploadStatus('success');
        
        const newUpload: UserUpload = {
          id: Date.now().toString(),
          fileName: file.name,
          fileType: file.name.split('.').pop() || 'unknown',
          size: (file.size / 1024).toFixed(1) + ' KB',
          uploadDate: new Date().toLocaleString('zh-CN'),
          status: 'pending',
          userName: currentUserData.name || 'Guest User',
          userEmail: currentUserData.email
        };
        saveUserUpload(newUpload);

      }, 2000);
    }
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
        <div className="flex gap-8">
           <button 
              onClick={() => setActiveTab('ai')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'ai' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
              }`}
           >
              AI 智能诊断
           </button>
           <button 
              onClick={() => setActiveTab('expert')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${
                activeTab === 'expert' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
              }`}
           >
              专家人工诊断
              {!hasPermission(currentUser, 'expert_diagnosis') && <Lock size={12} className="mb-0.5" />}
           </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        
        {/* --- TAB 1: AI Chat Interface --- */}
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
                        <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                          msg.sender === 'user' 
                            ? 'bg-blue-600 text-white rounded-tr-none' 
                            : 'bg-white text-slate-800 rounded-tl-none border border-slate-100 relative group pr-10'
                        }`}>
                          <div className="whitespace-pre-wrap">{msg.text}</div>
                          {msg.sender === 'ai' && <CopyButton text={msg.text} />}
                          
                          {/* Action Link */}
                          {msg.action === 'switch_to_expert' && (
                             <button 
                               onClick={() => setActiveTab('expert')}
                               className="mt-3 text-blue-600 underline hover:text-blue-800 text-xs font-bold flex items-center gap-1 bg-blue-50 p-2 rounded-lg transition-colors w-fit"
                             >
                               <Stethoscope size={14} />
                               专家人工诊断通道
                             </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="flex gap-3 max-w-[80%]">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white">
                          <span className="text-lg">⚓</span>
                        </div>
                        <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-2">
                          <Loader2 size={16} className="animate-spin text-blue-600" />
                          <span className="text-xs text-slate-400">大副正在思考...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
             </div>

             {/* Input Area */}
             <div className="p-4 bg-white border-t border-slate-200">
                <div className="max-w-3xl mx-auto relative flex items-center gap-2">
                  {step > 0 && step < 100 && (
                    <button onClick={restartDiagnosis} title="重新开始" className="p-3 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                      <RotateCcw size={20} />
                    </button>
                  )}
                  {messages.length > 1 && step < 100 && (
                    <button onClick={handleSummarize} disabled={isTyping} title="生成摘要" className="p-3 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors disabled:opacity-50">
                      <Sparkles size={20} />
                    </button>
                  )}
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder={step >= 100 ? "诊断已完成。请点击上方获取方案。" : "请在此输入您的回答..."}
                      disabled={step >= 100 || isTyping}
                      className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50"
                    />
                    <button 
                      onClick={handleSend}
                      disabled={!input.trim() || step >= 100 || isTyping}
                      className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </div>
             </div>
          </div>
        )}

        {/* --- TAB 2: Expert Interface --- */}
        {activeTab === 'expert' && (
          <div className="absolute inset-0 overflow-y-auto bg-slate-50 p-6 md:p-12">
            <div className="max-w-3xl mx-auto space-y-8">
              
              <div className="text-center mb-10">
                <h2 className="text-2xl font-bold text-slate-900">深度人工诊断服务</h2>
                <p className="text-slate-500 mt-2">当 AI 无法解决复杂问题时，我们的行业专家可以为您提供深度分析。</p>
              </div>

              {/* Step 1: Describe Problem */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-start gap-6 relative">
                 <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0 text-indigo-600 font-bold text-xl">
                    1
                 </div>
                 <div className="flex-1 w-full">
                     <h3 className="text-lg font-bold text-slate-800 mb-2">Step 1: 描述您的具体困境</h3>
                     <p className="text-slate-500 text-sm mb-4">请简要描述您遇到的核心问题，以便专家了解背景。</p>
                     
                     {expertIssueSubmitted ? (
                         <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-2 text-green-600 font-bold text-sm mb-2">
                                <CheckCircle size={16} /> 问题已提交
                            </div>
                            <p className="text-slate-700 text-sm italic">“{expertIssueDescription}”</p>
                            <button onClick={() => setExpertIssueSubmitted(false)} className="text-xs text-blue-600 hover:underline mt-2">修改描述</button>
                         </div>
                     ) : (
                         <div className="space-y-3">
                            <textarea 
                                value={expertIssueDescription}
                                onChange={(e) => setExpertIssueDescription(e.target.value)}
                                className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                                placeholder="例如：我们的排班总是出现高峰期人力不足，且员工抱怨排班不公平..."
                            />
                            <div className="flex justify-end">
                                <button 
                                   onClick={handleSubmitIssue}
                                   disabled={!expertIssueDescription.trim()}
                                   className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                >
                                   确认提交
                                </button>
                            </div>
                         </div>
                     )}
                 </div>
              </div>

              {/* Step 2: Download Tools */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-6 relative overflow-hidden">
                {/* Permission Gate Overlay (Visual only) */}
                {!hasPermission(currentUser, 'download_resources') && (
                   <div className="absolute top-2 right-2">
                      <Lock className="text-slate-300" size={16} />
                   </div>
                )}

                <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600 font-bold text-xl">
                   2
                </div>
                <div className="flex-1">
                   <h3 className="text-lg font-bold text-slate-800">Step 2: 下载诊断工具模版</h3>
                   <p className="text-slate-500 text-sm mt-1">进入知识库下载各类诊断工具，包括 Excel 模型、PPT 汇报模版及调查问卷。</p>
                   {downloadedFiles.length > 0 && (
                       <div className="mt-2 flex flex-wrap gap-2">
                           {downloadedFiles.map((f, i) => (
                               <span key={i} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full border border-green-100 flex items-center gap-1">
                                   <CheckCircle size={10} /> {f}
                               </span>
                           ))}
                       </div>
                   )}
                </div>
                <button 
                  onClick={handleOpenResourceModal}
                  className="px-5 py-2.5 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-900 transition-all flex items-center gap-2 shadow-lg shadow-slate-200"
                >
                  {hasPermission(currentUser, 'download_resources') ? <Download size={18} /> : <Lock size={16} />}
                  打开资源库下载
                </button>
              </div>

              {/* Step 3: Upload */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0 text-orange-600 font-bold text-xl">
                   3
                </div>
                <div className="flex-1 w-full">
                   <h3 className="text-lg font-bold text-slate-800">Step 3: 上传填写后的报告</h3>
                   <p className="text-slate-500 text-sm mt-1">请上传完善后的诊断文件。文件将直接发送至专家组邮箱。</p>
                   
                   {uploadStatus === 'idle' && (
                     <div className="mt-4 border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer relative group">
                        {!hasPermission(currentUser, 'expert_diagnosis') && (
                            <div className="absolute inset-0 bg-slate-50/80 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-lg">
                                <div className="flex items-center gap-2 text-slate-500 font-bold bg-white px-4 py-2 rounded-full shadow-sm">
                                    <Lock size={16} /> 需要专业版权限
                                </div>
                            </div>
                        )}
                       <input 
                          type="file" 
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                          onChange={handleFileUpload}
                          accept=".xlsx,.xls,.pdf,.doc,.docx,.ppt,.pptx"
                          disabled={!hasPermission(currentUser, 'expert_diagnosis')}
                       />
                       <div className="text-slate-400 flex flex-col items-center gap-2">
                          <Upload size={24} />
                          <span className="text-sm">点击或拖拽文件至此上传</span>
                       </div>
                     </div>
                   )}

                   {uploadStatus === 'uploading' && (
                     <div className="mt-4 p-4 bg-slate-50 rounded-lg flex items-center gap-3">
                       <Loader2 size={20} className="animate-spin text-blue-600" />
                       <span className="text-slate-600 text-sm">正在加密上传 {uploadedFileName}...</span>
                     </div>
                   )}

                   {uploadStatus === 'success' && (
                     <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-lg flex items-center gap-3">
                       <FileCheck size={20} className="text-green-600" />
                       <span className="text-green-800 text-sm font-medium">上传成功：{uploadedFileName}</span>
                     </div>
                   )}
                </div>
              </div>

              {/* Step 4: Expert Reply Window */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                 <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-sm">4</div>
                    <h3 className="font-bold text-slate-800">专家回复窗口</h3>
                 </div>
                 <div className="p-6 min-h-[160px] flex flex-col justify-center">
                    {uploadStatus === 'success' ? (
                      <div className="text-center animate-fade-in">
                        <div className="text-green-600 font-bold text-lg mb-1">已收到您的诊断材料</div>
                        <p className="text-slate-500 text-sm mb-4">专家团队将在 24 小时内分析完毕。</p>
                        
                        <div className="bg-blue-50 p-4 rounded-lg text-left max-w-lg mx-auto border border-blue-100">
                            <div className="flex items-start gap-3">
                                <Mail className="text-blue-600 mt-1" size={18} />
                                <div>
                                    <p className="text-sm text-blue-900 font-medium">回复方式</p>
                                    <p className="text-xs text-blue-700 mt-1">详细报告将发送至您的注册邮箱 ({currentUser?.email})，同时简报也会显示在此处。</p>
                                </div>
                            </div>
                        </div>
                      </div>
                    ) : (
                       <div className="text-center text-slate-400">
                         <MessageSquare size={32} className="mx-auto mb-2 opacity-20" />
                         <p className="text-sm">请先完成上方文件上传，专家回复将在此显示</p>
                       </div>
                    )}
                 </div>
              </div>
            </div>
          </div>
        )}

        {/* ... (Modals code omitted for brevity as it remains unchanged) ... */}
        {showResourceModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col animate-in zoom-in-95 relative overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <BookOpen className="text-blue-600" size={24} /> 专业诊断资源库
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">请根据您的需求选择下载对应的工具模版</p>
                        </div>
                        <button onClick={() => setShowResourceModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600">
                            <X size={24} />
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                            {knowledgeCategories.filter(c => c.section === 'diagnosis_tools').map(category => (
                                <div key={category.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                                    <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 pb-2 border-b border-slate-50">
                                        <span className={`w-2 h-2 rounded-full bg-${category.color}-500`}></span>
                                        {category.name}
                                    </h4>
                                    <div className="space-y-2">
                                        {category.items.map((item, idx) => (
                                            <ResourceItem 
                                                key={idx} 
                                                title={item.title} 
                                                type={item.type} 
                                                size={item.size} 
                                                locked={false}
                                                onClick={() => handleResourceDownload(item)} 
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

        {showPaymentGate && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col animate-in zoom-in-95 relative overflow-hidden">
                 <button 
                   onClick={() => setShowPaymentGate(false)}
                   className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors z-10"
                 >
                   <X size={20} />
                 </button>

                 <div className="flex h-full flex-col md:flex-row">
                    <div className="w-full md:w-2/5 bg-slate-900 text-white p-8 flex flex-col relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-3xl opacity-10 -mr-16 -mt-16"></div>
                       <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600 rounded-full blur-3xl opacity-10 -ml-16 -mb-16"></div>
                       
                       <div className="relative z-10 flex flex-col h-full">
                           <div className="mb-8">
                              <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-yellow-500 to-amber-600 text-white rounded-full text-xs font-bold mb-6 shadow-lg shadow-orange-900/20 ring-1 ring-white/20">
                                 <Crown size={14} className="fill-current" /> VIP 资源库
                              </div>
                              <h2 className="text-3xl font-bold leading-tight mb-4">解锁专业级<br/>管理工具库</h2>
                              <p className="text-slate-400 text-sm leading-relaxed">
                                 立即获取 50+ 份世界 500 强呼叫中心正在使用的标准化管理表格、流程图与 PPT 模版。
                              </p>
                           </div>
                           
                           <ul className="space-y-5 mb-8 flex-1">
                              <li className="flex items-start gap-3 text-sm">
                                 <div className="p-1 bg-green-500/20 rounded-full mt-0.5">
                                    <CheckCircle size={14} className="text-green-400" />
                                 </div>
                                 <span className="text-slate-300">Erlang-C 排班计算器 (Excel)</span>
                              </li>
                              <li className="flex items-start gap-3 text-sm">
                                 <div className="p-1 bg-green-500/20 rounded-full mt-0.5">
                                    <CheckCircle size={14} className="text-green-400" />
                                 </div>
                                 <span className="text-slate-300">专家人工诊断服务通道</span>
                              </li>
                              <li className="flex items-start gap-3 text-sm">
                                 <div className="p-1 bg-green-500/20 rounded-full mt-0.5">
                                     <CheckCircle size={14} className="text-green-400" />
                                 </div>
                                 <span className="text-slate-300">核心人才盘点 9-Box 模型</span>
                              </li>
                               <li className="flex items-start gap-3 text-sm">
                                 <div className="p-1 bg-green-500/20 rounded-full mt-0.5">
                                     <CheckCircle size={14} className="text-green-400" />
                                 </div>
                                 <span className="text-slate-300">年度运营规划 PPT 模版</span>
                              </li>
                           </ul>

                           <button 
                              onClick={() => navigate(AppRoute.PLANS)}
                              className="w-full py-4 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-slate-900 font-bold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/25"
                           >
                              <Crown size={20} className="fill-slate-900" /> 
                              立即升级解锁
                           </button>
                           <p className="text-center text-xs text-slate-500 mt-3">7天无理由退款保证</p>
                       </div>
                    </div>

                    <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
                       <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center">
                          <div>
                            <h3 className="font-bold text-slate-800 text-lg">VIP 资源预览</h3>
                            <p className="text-xs text-slate-500 mt-1">以下资源仅供 VIP 会员下载</p>
                          </div>
                          <div className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-500 flex items-center gap-1">
                            <Lock size={12} />
                            需升级
                          </div>
                       </div>
                       <div className="flex-1 overflow-y-auto p-6 space-y-6 relative">
                          {knowledgeCategories.filter(c => c.section === 'diagnosis_tools').map(category => (
                             <div key={category.id}>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full bg-${category.color}-500`}></span>
                                    {category.name}
                                </h4>
                                <div className="space-y-3">
                                   {category.items.map((item, idx) => (
                                      <ResourceItem key={idx} title={item.title} type={item.type} size={item.size} locked={true} />
                                   ))}
                                </div>
                             </div>
                          ))}
                          <div className="sticky bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none"></div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        )}

      </div>
    </div>
  );
};

export default Diagnosis;