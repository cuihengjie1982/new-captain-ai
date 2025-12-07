

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreHorizontal, ThumbsUp, MessageSquare, Send, CheckSquare, BookOpen, MessageCircle, X, PenTool, Loader2, Sparkles, User as UserIcon, Clock, Heart, Quote, Bot } from 'lucide-react';
import { getPostById, getComments, addComment, addReply, toggleCommentLike } from '../services/contentService';
import { saveReadArticle, saveAdminNote } from '../services/userDataService';
import { createChatSession, sendMessageToAI } from '../services/geminiService';
import { getKnowledgeCategories } from '../services/resourceService'; 
import { AppRoute, BlogPostComment, User, ChatMessage, Note, AdminNote } from '../types';

const BlogDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const post = id ? getPostById(id) : undefined;
  
  // Comment States
  const [comments, setComments] = useState<BlogPostComment[]>([]);
  const [currentUser, setCurrentUser] = useState<Partial<User>>({ name: '访客' });
  const [commentInput, setCommentInput] = useState('');
  const [replyInput, setReplyInput] = useState<{ [key: string]: string }>({}); 
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);

  // Side Panel States
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false); 
  const [activePanelTab, setActivePanelTab] = useState<'chat' | 'notes'>('chat');
  
  // Chat States
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const chatSessionRef = useRef<any>(null);

  // Note States
  const [notes, setNotes] = useState<Note[]>([]); 
  const [noteInput, setNoteInput] = useState('');
  const [currentQuote, setCurrentQuote] = useState<string | null>(null);

  // Text Selection Menu State
  const [selectionMenu, setSelectionMenu] = useState<{x: number, y: number, text: string} | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const storedUserStr = localStorage.getItem('captainUser');
    const storedUser = storedUserStr ? JSON.parse(storedUserStr) : null;
    if (storedUser) {
      setCurrentUser(storedUser);
    }

    if (id) {
      setComments(getComments(id));
      saveReadArticle(id, storedUser?.id); // Pass userId
    }

    chatSessionRef.current = createChatSession(undefined, 'text');
  }, [id]);

  // Separate effect for initializing chat messages when post changes
  useEffect(() => {
    if (post) {
       setChatMessages([{
         id: 'init',
         role: 'model',
         text: `您正在阅读《${post.title}》。\n\n您可以复制文章中的段落粘贴给我进行解释，或者将您的阅读心得记录在"我的笔记"中。`
       }]);
    }
  }, [post?.title]); // Only depend on post title to avoid re-renders

  // --- Robust Text Selection Logic ---
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      
      // If clicking inside the popup menu itself, do not clear
      if (menuRef.current && selection && selection.containsNode(menuRef.current, true)) {
        return;
      }

      if (!selection || selection.isCollapsed) {
        // Don't close immediately if we are interacting with the menu
        return;
      }

      const text = selection.toString().trim();
      if (!text) return;

      // Check if selection is inside an input or textarea
      const isInput = (node: Node | null) => {
         let curr = node;
         while (curr) {
           if (curr.nodeName === 'INPUT' || curr.nodeName === 'TEXTAREA') return true;
           curr = curr.parentNode;
         }
         return false;
      };

      if (isInput(selection.anchorNode)) {
         return;
      }

      try {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          
          if (rect.width > 0 && rect.height > 0) {
              setSelectionMenu({
                x: rect.left + (rect.width / 2),
                y: rect.top - 10, // Moved up slightly to avoid blocking text
                text: text
              });
          }
      } catch (err) {
          console.error("Selection range error", err);
      }
    };

    // We use mouseup to detect end of selection
    const handleMouseUp = (e: MouseEvent) => {
        // Only trigger if it's a left click to allow right-click context menu
        if (e.button === 0) {
             setTimeout(() => {
                handleSelectionChange();
            }, 10);
        }
    };

    // Clear menu on mousedown if clicking elsewhere
    const handleMouseDown = (e: MouseEvent) => {
       if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
           setSelectionMenu(null);
       }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  useEffect(() => {
    if (isSidePanelOpen && activePanelTab === 'notes' && noteTextareaRef.current) {
        setTimeout(() => {
            noteTextareaRef.current?.focus();
        }, 50);
    }
  }, [isSidePanelOpen, activePanelTab]);

  const handlePostComment = () => {
    if (!id || !commentInput.trim()) return;
    addComment(id, commentInput, currentUser);
    setComments(getComments(id));
    setCommentInput('');
  };

  const handleReplySubmit = (commentId: string) => {
    if (!id || !replyInput[commentId]?.trim()) return;
    addReply(id, commentId, replyInput[commentId], currentUser);
    setComments(getComments(id));
    setReplyInput({ ...replyInput, [commentId]: '' });
    setActiveReplyId(null);
  };

  const handleLike = (commentId: string, replyId?: string) => {
    toggleCommentLike(commentId, replyId);
    if (id) setComments(getComments(id));
  };

  const sendMessageInternal = async (text: string) => {
    if (!isSidePanelOpen) setIsSidePanelOpen(true);
    setActivePanelTab('chat');

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text };
    setChatMessages(prev => [...prev, userMsg]);
    setIsThinking(true);

    try {
      console.log('Blog AI: 开始处理用户请求', { text, hasChatSession: !!chatSessionRef.current });

      // AI Context Construction
      const categories = getKnowledgeCategories();
      const aiLibContent = categories
        .filter(c => c.section === 'ai_reply') // Updated filtering logic
        .flatMap(c => c.items.map(i => `- ${i.title}`))
        .join('\n');

      const contextPrompt = `
        角色：Captain AI 呼叫中心专家助手。
        当前上下文：用户正在阅读文章《${post?.title}》。
        文章摘要：${post?.summary}

        知识库可用资源：
        ${aiLibContent}

        用户问题：${text}

        请基于文章内容和呼叫中心专业知识回答。如果用户选中的是文章片段，请详细解释其含义。
      `;

      let replyText = '';
      if (chatSessionRef.current) {
        console.log('Blog AI: 调用AI服务');
        replyText = await sendMessageToAI(chatSessionRef.current, contextPrompt);
        console.log('Blog AI: AI服务响应成功', { replyLength: replyText.length });
      } else {
        console.warn('Blog AI: 聊天会话未初始化');
        replyText = "AI 服务连接中断，正在重新连接...";
        // 尝试重新初始化
        chatSessionRef.current = createChatSession(undefined, 'text');
        if (chatSessionRef.current) {
          replyText = await sendMessageToAI(chatSessionRef.current, contextPrompt);
        }
      }

      setChatMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: replyText }]);
    } catch (error) {
      console.error('Blog AI: 处理请求时发生错误', error);
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      setChatMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: `抱歉，AI服务暂时不可用。错误信息：${errorMsg}`
      }]);
    } finally {
      setIsThinking(false);
    }
  };

  // Menu Action: Explain with AI
  const handleMenuExplain = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectionMenu || !selectionMenu.text) return;
    
    const textToExplain = selectionMenu.text;
    
    setIsSidePanelOpen(true);
    setActivePanelTab('chat');
    
    const prompt = `请解释这段话的含义：“${textToExplain}”`;
    sendMessageInternal(prompt);
    
    setSelectionMenu(null);
    window.getSelection()?.removeAllRanges();
  };

  // Menu Action: Take Note
  const handleMenuTakeNote = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectionMenu || !selectionMenu.text) return;
    
    const textToQuote = selectionMenu.text;
    
    setIsSidePanelOpen(true);
    setActivePanelTab('notes');
    
    setCurrentQuote(textToQuote);
    
    setSelectionMenu(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    sendMessageInternal(chatInput);
    setChatInput('');
  };

  const handleSaveNote = () => {
    if (!noteInput.trim()) return;
    
    const now = new Date().toLocaleString('zh-CN');
    
    const newNote: Note = {
        id: Date.now().toString(),
        timestamp: 0,
        content: noteInput,
        quote: currentQuote || undefined,
        createdAt: now,
        userName: currentUser.name,
        userId: currentUser.id // Link note to user
    };
    setNotes([newNote, ...notes]);

    if (post) {
        const adminNote: AdminNote = {
            id: Date.now().toString(),
            content: noteInput,
            quote: currentQuote || undefined,
            lessonTitle: post.title,
            timestampDisplay: '文章摘录',
            createdAt: now,
            userName: currentUser.name || 'Guest User',
            userId: currentUser.id, // Link to user
            sourceType: 'article',
            sourceId: post.id
        };
        saveAdminNote(adminNote);
    }

    setNoteInput('');
    setCurrentQuote(null);
  };

  const toggleAssistant = () => {
    setIsSidePanelOpen(!isSidePanelOpen);
  };

  // Memoize content to prevent re-rendering DOM node on state changes (which kills selection)
  // This ensures that when selectionMenu appears (state change), the article HTML isn't reset, preserving selection.
  const contentMarkup = React.useMemo(() => {
    return post ? { __html: post.content } : { __html: '' };
  }, [post?.content]);

  // Use a memoized style object to prevent style prop churn
  const contentStyle = React.useMemo(() => ({ 
    userSelect: 'text' as const, 
    WebkitUserSelect: 'text' as const 
  }), []);

  if (!post) {
    return (
      <div className="p-8 text-center">
        <p>文章未找到</p>
        <button onClick={() => navigate(AppRoute.BLOG)} className="text-blue-600 mt-4">返回列表</button>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-full relative flex flex-col lg:flex-row overflow-hidden h-screen">
      
      {/* --- Text Selection Menu --- */}
      {selectionMenu && (
        <div 
          ref={menuRef}
          className="fixed z-[9999] bg-slate-900 text-white rounded-lg shadow-xl flex items-center p-1 gap-1 transform -translate-x-1/2 -translate-y-full animate-in zoom-in duration-150 origin-bottom select-none"
          style={{ left: selectionMenu.x, top: selectionMenu.y }}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }} 
        >
          <button 
            onClick={handleMenuExplain}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-700 rounded-md text-xs font-medium transition-colors whitespace-nowrap"
          >
            <Sparkles size={14} className="text-blue-400" />
            AI 解释
          </button>
          <div className="w-px h-4 bg-slate-700"></div>
          <button 
            onClick={handleMenuTakeNote}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-700 rounded-md text-xs font-medium transition-colors whitespace-nowrap"
          >
            <CheckSquare size={14} className="text-green-400" />
            记笔记
          </button>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900"></div>
        </div>
      )}

      {/* --- Main Content Area --- */}
      <div className="flex-1 overflow-y-auto bg-white relative" id="article-container">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center justify-between z-20">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate(AppRoute.BLOG)} className="text-slate-700 p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <span className="font-medium text-slate-900 text-sm truncate max-w-[200px] opacity-0 md:opacity-100 transition-opacity">
                    {post.title}
                </span>
            </div>
            <div className="flex items-center gap-2">
                <button 
                  onClick={toggleAssistant}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold transition-all border ${isSidePanelOpen ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-inner' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shadow-sm'}`}
                >
                   <Bot size={18} className={isSidePanelOpen ? "text-blue-600" : "text-slate-500"} />
                   <span className="hidden md:inline">{isSidePanelOpen ? '收起助手' : 'AI 学习助手'}</span>
                </button>
            </div>
        </div>

        <div className="max-w-[680px] mx-auto px-6 py-8 pb-32">
            <h1 className="text-3xl font-bold text-slate-900 leading-tight mb-6 tracking-tight select-text">
                {post.title}
            </h1>

            <div className="flex items-center gap-4 text-sm mb-8 pb-8 border-b border-slate-100 select-text">
                <span className="font-bold text-slate-900">{post.author}</span>
                <span className="text-slate-400">{post.date}</span>
                <span className="text-slate-400 flex items-center gap-1"><Clock size={14} /> {post.readTime}</span>
            </div>

            {/* 
                Optimization: Using memoized contentMarkup prevents the innerHTML from being reset on re-renders.
                This allows text selection to persist even when state changes (e.g., menu appearing).
                Explicitly setting user-select to text ensures copyability.
            */}
            <div 
                id="article-content"
                className="prose prose-lg prose-slate max-w-none prose-headings:font-bold prose-a:text-blue-600 prose-img:rounded-xl prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-slate-50 prose-blockquote:py-2 prose-blockquote:px-4 selection:bg-blue-100 selection:text-blue-900 select-text cursor-text"
                style={contentStyle}
                dangerouslySetInnerHTML={contentMarkup}
            />

            <div className="mt-12 pt-8 border-t border-slate-100 flex items-center justify-between select-none">
                <div className="flex gap-4">
                    <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors">
                        <ThumbsUp size={18} /> 赞
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors">
                        <MoreHorizontal size={18} />
                    </button>
                </div>
                <span className="text-sm text-slate-400">阅读 3256</span>
            </div>

            <div className="mt-16 select-none">
                <h3 className="font-bold text-xl text-slate-900 mb-6">精选评论 ({comments.length})</h3>
                
                <div className="flex gap-4 mb-8">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden">
                        <UserIcon className="w-full h-full p-2 text-slate-400" />
                    </div>
                    <div className="flex-1">
                        <div className="relative">
                            <textarea 
                                value={commentInput}
                                onChange={(e) => setCommentInput(e.target.value)}
                                placeholder="写下您的想法..."
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none h-24 transition-all select-text"
                                style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                            />
                            <button 
                                onClick={handlePostComment}
                                disabled={!commentInput.trim()}
                                className="absolute bottom-3 right-3 px-4 py-1.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                发布
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    {comments.map(comment => (
                        <div key={comment.id} className="flex gap-4">
                            <img src={comment.userAvatar} alt={comment.userName} className="w-10 h-10 rounded-full bg-slate-100 object-cover" />
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-slate-800 text-sm">{comment.userName}</span>
                                    <span className="text-xs text-slate-400">{comment.date}</span>
                                </div>
                                <p className="text-slate-700 text-sm leading-relaxed mb-2 select-text" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>{comment.content}</p>
                                
                                <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                                    <button 
                                        onClick={() => handleLike(comment.id)}
                                        className={`flex items-center gap-1 hover:text-blue-600 ${comment.isLiked ? 'text-blue-600' : ''}`}
                                    >
                                        <Heart size={14} className={comment.isLiked ? 'fill-current' : ''} />
                                        {comment.likes || '赞'}
                                    </button>
                                    <button 
                                        onClick={() => setActiveReplyId(activeReplyId === comment.id ? null : comment.id)}
                                        className="hover:text-blue-600 flex items-center gap-1"
                                    >
                                        <MessageSquare size={14} /> 回复
                                    </button>
                                </div>

                                {activeReplyId === comment.id && (
                                    <div className="flex gap-3 mt-3 mb-4 animate-in fade-in slide-in-from-top-2">
                                        <input 
                                            type="text"
                                            value={replyInput[comment.id] || ''}
                                            onChange={(e) => setReplyInput({ ...replyInput, [comment.id]: e.target.value })}
                                            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 select-text"
                                            style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                                            placeholder={`回复 ${comment.userName}...`}
                                        />
                                        <button 
                                            onClick={() => handleReplySubmit(comment.id)}
                                            className="px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg"
                                        >
                                            发送
                                        </button>
                                    </div>
                                )}

                                {comment.replies.length > 0 && (
                                    <div className="bg-slate-50 rounded-lg p-4 space-y-4 mt-2">
                                        {comment.replies.map(reply => (
                                            <div key={reply.id} className="flex gap-3">
                                                <img src={reply.userAvatar} className="w-6 h-6 rounded-full bg-slate-200" alt="" />
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <span className="font-bold text-slate-700 text-xs">{reply.userName}</span>
                                                    </div>
                                                    <p className="text-slate-600 text-xs leading-relaxed mb-1.5 select-text" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
                                                        {reply.content}
                                                    </p>
                                                    <button 
                                                        onClick={() => handleLike(comment.id, reply.id)}
                                                        className={`text-[10px] flex items-center gap-1 hover:text-blue-600 ${reply.isLiked ? 'text-blue-600' : 'text-slate-400'}`}
                                                    >
                                                        <Heart size={10} className={reply.isLiked ? 'fill-current' : ''} />
                                                        {reply.likes || '赞'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* --- RIGHT SIDE PANEL (Chat & Notes) --- */}
      <div 
         className={`fixed inset-y-0 right-0 w-full md:w-[380px] bg-white border-l border-slate-200 shadow-2xl transform transition-transform duration-300 ease-in-out z-40 flex flex-col ${
            isSidePanelOpen ? 'translate-x-0' : 'translate-x-full'
         } lg:relative lg:transform-none lg:w-[380px] lg:border-l lg:shadow-none ${!isSidePanelOpen && 'lg:hidden'}`}
      >
         <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <div className="flex gap-4">
                <button 
                    onClick={() => setActivePanelTab('chat')}
                    className={`text-sm font-bold pb-3 -mb-3.5 border-b-2 transition-colors flex items-center gap-2 ${activePanelTab === 'chat' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
                >
                    <Sparkles size={14} /> AI 助手
                </button>
                <button 
                    onClick={() => setActivePanelTab('notes')}
                    className={`text-sm font-bold pb-3 -mb-3.5 border-b-2 transition-colors flex items-center gap-2 ${activePanelTab === 'notes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
                >
                    <PenTool size={14} /> 我的笔记
                </button>
            </div>
            <button onClick={() => setIsSidePanelOpen(false)} className="p-1 hover:bg-slate-100 rounded lg:hidden">
                <X size={20} className="text-slate-500" />
            </button>
         </div>

         <div className="flex-1 overflow-hidden bg-slate-50/50 relative">
            
            {activePanelTab === 'chat' && (
                <div className="absolute inset-0 flex flex-col">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {chatMessages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-xl text-sm leading-relaxed shadow-sm ${
                                    msg.role === 'user' 
                                        ? 'bg-blue-600 text-white rounded-tr-none' 
                                        : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                                }`}>
                                    <div className="whitespace-pre-wrap select-text">{msg.text}</div>
                                </div>
                            </div>
                        ))}
                        {isThinking && (
                            <div className="flex justify-start">
                                <div className="bg-white p-3 rounded-xl rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-2">
                                    <Loader2 size={14} className="animate-spin text-blue-600" />
                                    <span className="text-xs text-slate-500">思考中...</span>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="p-3 bg-white border-t border-slate-200">
                        <div className="relative">
                            <input
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                                placeholder="输入问题，或粘贴文章段落让 AI 解释..."
                                className="w-full pl-4 pr-10 py-3 bg-slate-100 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm outline-none transition-all"
                            />
                            <button 
                                onClick={handleSendChat}
                                disabled={!chatInput.trim() || isThinking}
                                className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activePanelTab === 'notes' && (
                <div className="absolute inset-0 flex flex-col">
                    <div className="p-4 border-b border-slate-200 bg-white">
                        {currentQuote && (
                            <div className="mb-3 p-3 bg-slate-50 border-l-4 border-blue-500 rounded-r-lg relative group animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <Quote size={12} className="text-blue-500 fill-current" />
                                    <span className="text-[10px] font-bold text-blue-600 uppercase">原文摘录</span>
                                </div>
                                <p className="text-xs text-slate-600 italic line-clamp-3 select-text">“{currentQuote}”</p>
                                <button 
                                    onClick={() => setCurrentQuote(null)}
                                    className="absolute top-1 right-1 p-1.5 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors"
                                    title="移除引用"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        )}

                        <div className="relative">
                            <textarea
                                ref={noteTextareaRef}
                                value={noteInput}
                                onChange={(e) => setNoteInput(e.target.value)}
                                placeholder={currentQuote ? "针对这段文字，您的想法是..." : "记录阅读心得，或粘贴精彩摘录..."}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none h-24"
                            />
                            <button
                                onClick={handleSaveNote}
                                disabled={!noteInput.trim()}
                                className="absolute bottom-2 right-2 px-3 py-1 bg-slate-800 text-white text-xs font-bold rounded-md hover:bg-slate-700 disabled:opacity-50 transition-colors"
                            >
                                保存
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {notes.length === 0 && (
                            <div className="text-center text-slate-400 mt-10">
                                <PenTool size={32} className="mx-auto mb-2 opacity-20" />
                                <p className="text-sm">暂无笔记</p>
                                <p className="text-xs mt-1">选中文本可快速添加引用，或直接在此记录</p>
                            </div>
                        )}
                        {notes.map((note) => (
                            <div key={note.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                                {note.quote && (
                                    <div className="relative pl-3 border-l-2 border-blue-400 bg-slate-50 p-2 rounded-r-lg">
                                         <div className="flex items-center gap-2 mb-1">
                                            <span className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                                <Quote size={10} />
                                            </span>
                                            <span className="text-xs font-bold text-slate-500">原文摘录</span>
                                         </div>
                                         <p className="text-xs text-slate-600 italic font-serif leading-relaxed select-text">
                                            “{note.quote}”
                                         </p>
                                    </div>
                                )}

                                <div className="flex items-start gap-2">
                                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <UserIcon size={14} className="text-indigo-600" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-baseline mb-1">
                                             <span className="text-xs font-bold text-slate-800">{currentUser.name || '我'}</span>
                                             <span className="text-[10px] text-slate-400">{note.createdAt || '刚刚'}</span>
                                        </div>
                                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap select-text">
                                            {note.content}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
         </div>
      </div>

    </div>
  );
};

export default BlogDetail;