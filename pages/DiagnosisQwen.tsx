import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppRoute, DiagnosisSubmission, User } from '../types';
import { getDiagnosisSubmissions, saveDiagnosisSubmission } from '../services/userDataService';
import { getAIDiagnosis, qwenService } from '../services/qwenService';
import { hasPermission } from '../services/permissionService';
import {
  ArrowRight, Send, Loader2, RotateCcw, Sparkles,
  Bot, MessageSquare, Video, Mic, Wifi, WifiOff, CheckCircle,
  AlertCircle, Crown, Lock
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp?: string;
}

// 通义千问版本的智能诊断组件
const DiagnosisQwen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // State
  const [activeTab, setActiveTab] = useState<'ai' | 'qwen' | 'expert'>('qwen');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [conversationContext, setConversationContext] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 获取用户信息
    const storedUser = localStorage.getItem('captainUser');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }

    // 初始化消息
    initializeConversation();

    // 检查API状态
    checkAPIStatus();

    return () => {
      // 清理资源
    };
  }, []);

  const initializeConversation = () => {
    const initialIssue = location.state?.initialIssue;
    const initialMessages: Message[] = [
      {
        id: 'welcome',
        sender: 'ai',
        text: `你好！我是Captain AI的运营诊断官（阿里云通义千问版）。我可以帮你分析呼叫中心运营中的各种问题。

请告诉我你当前遇到的具体挑战，比如：
- 人员流失率高
- 服务质量不稳定
- 运营成本过高
- 员工积极性不足
- 客户满意度下降
- 其他运营相关问题

你可以直接用文字描述，我会为你提供专业的诊断建议。`,
        timestamp: new Date().toISOString()
      }
    ];

    if (initialIssue) {
      initialMessages.push({
        id: 'user-initial',
        sender: 'user',
        text: initialIssue,
        timestamp: new Date().toISOString()
      });
    }

    setMessages(initialMessages);

    if (initialIssue) {
      // 如果有初始问题，自动生成AI回复
      setTimeout(() => {
        handleAIResponse(initialIssue);
      }, 1000);
    }
  };

  const checkAPIStatus = async () => {
    setApiStatus('checking');
    try {
      const isHealthy = await qwenService.checkHealth();
      setApiStatus(isHealthy ? 'online' : 'offline');
    } catch (error) {
      console.error('API状态检查失败:', error);
      setApiStatus('offline');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      await handleAIResponse(userMessage.text);
    } catch (error) {
      console.error('AI回复失败:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: '抱歉，我现在遇到了一些技术问题。请稍后再试，或者切换到其他诊断方式。',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleAIResponse = async (userInput: string) => {
    try {
      // 构建对话上下文
      const contextMessages = messages
        .slice(-5) // 获取最近5条消息作为上下文
        .map(msg => `${msg.sender}: ${msg.text}`)
        .join('\n');

      const aiResponse = await getAIDiagnosis(userInput, contextMessages);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: aiResponse,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);

      // 更新对话上下文
      setConversationContext(prev => prev + `\n用户：${userInput}\nAI：${aiResponse}`);

    } catch (error) {
      console.error('AI诊断失败:', error);
      throw error;
    }
  };

  const handleRestart = () => {
    setMessages([{
      id: 'restart',
      sender: 'ai',
      text: '好的，让我们重新开始。请告诉我你遇到的新问题，或者我们可以从不同角度分析之前的问题。',
      timestamp: new Date().toISOString()
    }]);
    setConversationContext('');
  };

  const handleSummarize = async () => {
    if (messages.length <= 2 || isTyping) return;

    setIsTyping(true);
    try {
      const conversationText = messages
        .slice(1) // 跳过欢迎消息
        .map(msg => `${msg.sender === 'user' ? '用户' : 'AI'}: ${msg.text}`)
        .join('\n');

      const summaryPrompt = `请为以下对话生成一个简洁的摘要（150字以内），重点包括：\n1. 用户的主要问题\n2. 诊断的关键发现\n3. 建议的解决方案方向\n\n对话内容：\n${conversationText}`;

      const summary = await qwenService.complete(summaryPrompt, { max_tokens: 300 });

      const summaryMessage: Message = {
        id: Date.now().toString(),
        sender: 'ai',
        text: `📝 **对话摘要**\n\n${summary}`,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, summaryMessage]);
    } catch (error) {
      console.error('生成摘要失败:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const isAdmin = currentUser?.role === 'admin';
  const isPro = currentUser?.plan === 'pro' || isAdmin;

  return (
    <div className="h-full flex flex-col bg-white relative">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 pt-4 px-6 pb-0 sticky top-0 z-10 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Bot className="text-blue-600" size={24} />
              AI 智能诊断 (阿里云版)
            </h1>
            <p className="text-sm text-slate-500">主题：{location.state?.initialIssue || '运营诊断'}</p>
          </div>

          {/* API状态指示器 */}
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
              apiStatus === 'online' ? 'bg-green-100 text-green-700' :
              apiStatus === 'checking' ? 'bg-yellow-100 text-yellow-700 animate-pulse' :
              'bg-red-100 text-red-700'
            }`}>
              {apiStatus === 'online' ? <CheckCircle size={12} /> :
               apiStatus === 'checking' ? <Loader2 size={12} className="animate-spin" /> :
               <WifiOff size={12} />}
              {apiStatus === 'online' ? '阿里云已连接' :
               apiStatus === 'checking' ? '连接中...' : '连接失败'}
            </div>

            {messages.length > 3 && (
              <button
                onClick={() => navigate(AppRoute.SOLUTION)}
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg transition-all"
              >
                获取解决方案 <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Tab切换器 */}
        <div className="flex gap-8 overflow-x-auto">
           <button onClick={() => setActiveTab('ai')} className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'ai' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'}`}>原版AI诊断</button>
           <button onClick={() => setActiveTab('qwen')} className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 whitespace-nowrap ${activeTab === 'qwen' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'}`}>
             <Bot size={14} className="mb-0.5" /> 阿里云AI诊断
           </button>
           <button onClick={() => setActiveTab('expert')} className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 whitespace-nowrap ${activeTab === 'expert' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'}`}>
              专家人工诊断
              {!hasPermission(currentUser, 'expert_diagnosis') && <Lock size={12} className="mb-0.5" />}
           </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'qwen' && (
          <div className="absolute inset-0 flex flex-col">
             {/* Messages Area */}
             <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                <div className="max-w-3xl mx-auto space-y-6">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex gap-3 max-w-[85%] md:max-w-[75%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border border-white shadow-sm ${
                          msg.sender === 'user' ? 'bg-slate-200' : 'bg-blue-600 text-white'
                        }`}>
                          {msg.sender === 'user' ? <span className="text-lg">👤</span> : <Bot size={20} />}
                        </div>
                        <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                          msg.sender === 'user'
                            ? 'bg-blue-600 text-white rounded-tr-none'
                            : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                        }`}>
                          <div className="whitespace-pre-wrap">{msg.text}</div>
                          {msg.timestamp && (
                            <div className={`text-xs mt-2 opacity-70 ${
                              msg.sender === 'user' ? 'text-blue-100' : 'text-slate-500'
                            }`}>
                              {new Date(msg.timestamp).toLocaleTimeString('zh-CN', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
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
                          <span className="text-xs text-slate-500">通义千问正在分析...</span>
                       </div>
                    </div>
                  )}

                  {apiStatus === 'offline' && (
                    <div className="flex justify-center">
                       <div className="bg-red-50 p-4 rounded-xl border border-red-100 max-w-md text-center">
                          <WifiOff size={20} className="text-red-600 mx-auto mb-2" />
                          <p className="text-sm text-red-700">阿里云API连接失败，请检查网络或稍后重试</p>
                          <button
                            onClick={checkAPIStatus}
                            className="mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700"
                          >
                            重新连接
                          </button>
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
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="描述您遇到的具体运营问题..."
                      className="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none resize-none h-14 max-h-32 transition-all"
                      disabled={apiStatus !== 'online' || isTyping}
                   />
                   <button
                      onClick={handleSend}
                      disabled={!input.trim() || isTyping || apiStatus !== 'online'}
                      className="absolute right-2 top-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                   >
                      <Send size={18} />
                   </button>
                </div>

                {/* Action Buttons */}
                <div className="max-w-3xl mx-auto mt-2 flex justify-center gap-4">
                    <button
                      onClick={handleSummarize}
                      disabled={messages.length <= 2 || isTyping || apiStatus !== 'online'}
                      className="text-xs text-slate-400 hover:text-blue-600 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Sparkles size={12} /> 生成摘要
                    </button>
                    <button
                      onClick={handleRestart}
                      disabled={isTyping}
                      className="text-xs text-slate-400 hover:text-red-600 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RotateCcw size={12} /> 重新开始
                    </button>
                </div>
             </div>
          </div>
        )}

        {/* AI Tab (原版) */}
        {activeTab === 'ai' && (
          <div className="absolute inset-0 overflow-hidden bg-slate-50 p-6">
            <div className="max-w-4xl mx-auto h-full flex flex-col justify-center items-center text-center">
              <Bot size={64} className="text-slate-400 mb-4" />
              <h2 className="text-2xl font-bold text-slate-800 mb-2">原版AI诊断</h2>
              <p className="text-slate-600 mb-6">这里可以集成原有的诊断功能</p>
              <button
                onClick={() => setActiveTab('qwen')}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                体验阿里云版
              </button>
            </div>
          </div>
        )}

        {/* Expert Tab */}
        {activeTab === 'expert' && (
          <div className="absolute inset-0 overflow-hidden bg-slate-50 p-6">
            <div className="max-w-4xl mx-auto h-full flex flex-col justify-center items-center text-center">
              <Crown size={64} className="text-slate-400 mb-4" />
              <h2 className="text-2xl font-bold text-slate-800 mb-2">专家人工诊断</h2>
              <p className="text-slate-600 mb-6">
                {!hasPermission(currentUser, 'expert_diagnosis')
                  ? '此功能需要专业版权限'
                  : '此功能正在开发中'}
              </p>
              {!hasPermission(currentUser, 'expert_diagnosis') && (
                <button className="px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-black transition-colors">
                  升级到专业版
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiagnosisQwen;