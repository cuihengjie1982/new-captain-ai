
import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, CheckSquare, Download, 
  MessageCircle, Send, Bookmark, Loader2, FileText, 
  ListVideo, Clock, ChevronRight, Search, Sparkles,
  Highlighter, PenTool, Maximize, Minimize, Settings,
  ChevronLeft, ArrowLeft, X, Crown, ArrowRight, Quote,
  Wand2, Star, MapPin, Lightbulb, Wrench, Target, Layers, Tag
} from 'lucide-react';
import { Note, ChatMessage, Lesson, Highlight, AdminNote, User } from '../types';
import { createChatSession, sendMessageToAI } from '../services/geminiService';
import { getLessons } from '../services/courseService';
import { saveAdminNote, saveWatchedLesson } from '../services/userDataService';
import { hasPermission } from '../services/permissionService';
import { useNavigate, useParams } from 'react-router-dom';
import { AppRoute } from '../types';

interface HighlightCategory {
  id: string;
  label: string;
  type: 'concept' | 'tactic' | 'case' | 'custom' | 'general';
  items: Highlight[];
}

const SolutionDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  // State
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLessonId, setCurrentLessonId] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeTab, setActiveTab] = useState<'transcript' | 'chat' | 'notes'>('transcript');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Playback Controls State
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Highlight Generation State
  const [highlightInput, setHighlightInput] = useState('');
  const [isGeneratingHighlights, setIsGeneratingHighlights] = useState(false);
  const [highlightCategories, setHighlightCategories] = useState<HighlightCategory[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('default');

  // Selection Menu State
  const [selectionMenu, setSelectionMenu] = useState<{x: number, y: number, text: string} | null>(null);

  // Upgrade Modal State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null); // Ref for Fullscreen
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const chatSessionRef = useRef<any>(null);
  
  // Notes State
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteInput, setNoteInput] = useState('');
  const [currentQuote, setCurrentQuote] = useState<string | null>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 'init', role: 'model', text: "你好！我是本课程的AI助教。关于这节课的内容，无论是概念解释还是实操建议，随时问我！" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // Load Lessons
  useEffect(() => {
    const data = getLessons();
    setLessons(data);
    if (id) {
        const found = data.find(l => l.id === id);
        if (found) setCurrentLessonId(found.id);
        else if (data.length > 0) setCurrentLessonId(data[0].id);
    } else if (data.length > 0) {
      setCurrentLessonId(data[0].id);
    }
    const storedUser = localStorage.getItem('captainUser');
    if (storedUser) setCurrentUser(JSON.parse(storedUser));
  }, [id]);

  // Derived State
  const currentLesson = lessons.find(l => l.id === currentLessonId) || lessons[0];

  // Sync displayed highlights when lesson changes
  useEffect(() => {
    if (currentLesson) {
      // Initial Default Category
      const initialHighlights = currentLesson.highlights?.length > 0 ? currentLesson.highlights : [
          { label: "核心观点", time: 10, color: 'bg-blue-100 text-blue-700 border-blue-500' },
          { label: "案例分析", time: Math.floor(currentLesson.durationSec * 0.3), color: 'bg-purple-100 text-purple-700 border-purple-500' },
          { label: "实操步骤", time: Math.floor(currentLesson.durationSec * 0.6), color: 'bg-green-100 text-green-700 border-green-500' },
          { label: "关键总结", time: Math.floor(currentLesson.durationSec * 0.85), color: 'bg-orange-100 text-orange-700 border-orange-500' }
      ];
      
      setHighlightCategories([{
          id: 'default',
          label: '默认概览',
          type: 'general',
          items: initialHighlights
      }]);
      setActiveCategoryId('default');
      
      setHighlightInput('');
      setSelectionMenu(null);
      // Track history with user ID if available
      const storedUser = localStorage.getItem('captainUser');
      const userId = storedUser ? JSON.parse(storedUser).id : undefined;
      saveWatchedLesson(currentLesson.id, userId); 
    }
  }, [currentLessonId, currentLesson]);

  // Get active highlights
  const activeHighlights = highlightCategories.find(c => c.id === activeCategoryId)?.items || [];

  // Initialize Chat
  useEffect(() => {
    if (currentLessonId) {
      chatSessionRef.current = createChatSession(undefined, 'text');
    }
  }, [currentLessonId]);

  // Update playback rate on video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Video Time Update Mock (Adjusted for playbackRate) - Only runs if no real video
  useEffect(() => {
    let interval: any;
    if (isPlaying && currentLesson && !currentLesson.videoUrl) {
      const tickRate = 1000 / playbackRate; // Adjust interval based on speed
      interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= currentLesson.durationSec) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, tickRate);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentLesson, playbackRate]);

  // Auto-scroll Transcript
  useEffect(() => {
    if (activeTab === 'transcript' && transcriptContainerRef.current) {
      // Only auto-scroll if user isn't interacting with text selection
      if (!selectionMenu) {
        const activeElement = transcriptContainerRef.current.querySelector('.active-transcript');
        if (activeElement) {
          activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [currentTime, activeTab, selectionMenu]);

  // Fullscreen Event Listener
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  if (!currentLesson) return <div className="flex items-center justify-center h-full">Loading...</div>;

  // Handlers
  const handlePlayPause = () => {
    if (currentLesson.videoUrl && videoRef.current) {
        if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    } else {
        // Simulation mode
        setIsPlaying(!isPlaying);
    }
  };
  
  const handleJumpToTime = (time: number) => {
    setCurrentTime(time);
    if (currentLesson.videoUrl && videoRef.current) {
        videoRef.current.currentTime = time;
        videoRef.current.play();
        setIsPlaying(true);
    } else {
        setIsPlaying(true);
    }
  };

  const handlePlayAll = () => {
      if(activeHighlights.length > 0) {
          handleJumpToTime(activeHighlights[0].time);
          // In a real app, this would queue playback of only highlight segments
          alert("开始播放所有高亮片段 (演示模式: 从第一个高亮开始播放)");
      }
  };

  const handleToggleFullScreen = () => {
    if (!playerContainerRef.current) return;
    
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSaveNote = (text?: string) => {
    const content = text || noteInput;
    if (!content.trim()) return;
    
    // 1. Save to local view
    const newNote: Note = {
      id: Date.now().toString(),
      timestamp: currentTime,
      content: content,
      quote: currentQuote || undefined,
      userId: currentUser?.id // Link to user
    };
    setNotes([newNote, ...notes]);

    // 2. Save to Admin Service
    const currentUserData = JSON.parse(localStorage.getItem('captainUser') || '{}');
    const adminNote: AdminNote = {
      id: Date.now().toString(),
      content: content,
      quote: currentQuote || undefined,
      lessonTitle: currentLesson.title,
      timestampDisplay: formatTime(currentTime),
      createdAt: new Date().toLocaleString('zh-CN'),
      userName: currentUserData.name || 'Guest User',
      userId: currentUserData.id, // Link to user
      sourceType: 'video', // Video note
      sourceId: currentLesson.id
    };
    saveAdminNote(adminNote);

    if (!text) setNoteInput(''); // Only clear input if manually typed
    setCurrentQuote(null);
  };

  const handleGenerateHighlights = async () => {
    // Allow empty input for auto-analysis of the whole video
    setIsGeneratingHighlights(true);

    try {
      const chat = createChatSession(undefined, 'text'); // Use a temporary session for this task
      if (!chat) throw new Error("AI Service Unavailable");

      // Prepare context from transcript
      const transcriptText = currentLesson.transcript
        .map(t => `[${t.time}s] ${t.text}`)
        .join('\n');

      let prompt = '';
      
      if (highlightInput.trim()) {
          // User provided a specific topic -> Single Custom Category
          prompt = `
            任务：基于以下视频字幕，找出与主题“${highlightInput}”最相关的2-3个关键时间点。
            字幕：
            ${transcriptText}

            请 strictly 按此格式返回：
            DIMENSION: Search Result
            [Label]|[Seconds]
            [Label]|[Seconds]

            要求：
            1. 标签要精准概括该片段内容。
            2. 秒数必须是整数。
          `;
      } else {
          // Auto-analysis -> Multiple Categories
          prompt = `
            Task: Analyze the video transcript and generate structured highlights organized into 3 distinct dimensions:
            1. "Core Concepts" (核心观点 - Key theories and definitions)
            2. "Practical Tactics" (实操技巧 - How-to steps)
            3. "Case Studies" (案例分析 - Stories and examples)

            Format the output strictly as follows (Do not add markdown code blocks):
            
            DIMENSION: Core Concepts
            [Label]|[Seconds]
            [Label]|[Seconds]
            
            DIMENSION: Practical Tactics
            [Label]|[Seconds]
            
            DIMENSION: Case Studies
            [Label]|[Seconds]
            
            Requirements:
            1. Label should be Chinese (4-10 chars).
            2. Seconds must be integer.
            3. Find at least 2 items for each dimension if possible.
            字幕：
            ${transcriptText}
          `;
      }

      const responseText = await sendMessageToAI(chat, prompt);
      
      // Parse response with Categories
      const newCategories: HighlightCategory[] = [];
      const lines = responseText.split('\n');
      
      let currentCategory: Partial<HighlightCategory> | null = null;
      
      // Color palettes for different types
      const colorMap: Record<string, string[]> = {
          'Core Concepts': ['bg-blue-100 text-blue-700 border-blue-500', 'bg-indigo-100 text-indigo-700 border-indigo-500'],
          'Practical Tactics': ['bg-green-100 text-green-700 border-green-500', 'bg-emerald-100 text-emerald-700 border-emerald-500'],
          'Case Studies': ['bg-orange-100 text-orange-700 border-orange-500', 'bg-amber-100 text-amber-700 border-amber-500'],
          'Search Result': ['bg-purple-100 text-purple-700 border-purple-500', 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-500']
      };

      let itemIdx = 0;

      for (const line of lines) {
          const trimLine = line.trim();
          if (trimLine.startsWith('DIMENSION:')) {
              // Save previous
              if (currentCategory && currentCategory.items && currentCategory.items.length > 0) {
                  newCategories.push(currentCategory as HighlightCategory);
              }
              
              const label = trimLine.replace('DIMENSION:', '').trim();
              let type: HighlightCategory['type'] = 'general';
              if (label.includes('Concept') || label.includes('观点')) type = 'concept';
              else if (label.includes('Tactic') || label.includes('技巧')) type = 'tactic';
              else if (label.includes('Case') || label.includes('案例')) type = 'case';
              else if (label.includes('Search')) type = 'custom';

              currentCategory = {
                  id: `cat-${Date.now()}-${newCategories.length}`,
                  label: label,
                  type: type,
                  items: []
              };
              itemIdx = 0;
          } else if (trimLine.includes('|') && currentCategory) {
              const parts = trimLine.split('|');
              if (parts.length >= 2) {
                  const label = parts[0].trim().replace(/[\*\-]/g, '');
                  const time = parseInt(parts[1].trim());
                  
                  if (label && !isNaN(time)) {
                      // Determine color
                      const palette = colorMap[currentCategory.label!] || colorMap['Search Result'];
                      const color = palette[itemIdx % palette.length];
                      
                      currentCategory.items!.push({ label, time, color });
                      itemIdx++;
                  }
              }
          }
      }
      // Push last category
      if (currentCategory && currentCategory.items && currentCategory.items.length > 0) {
          newCategories.push(currentCategory as HighlightCategory);
      }

      if (newCategories.length > 0) {
        if (highlightInput.trim()) {
            // If custom search, just replace/add the custom one
            setHighlightCategories([newCategories[0]]);
            setActiveCategoryId(newCategories[0].id);
        } else {
            // If auto parse, show all generated categories
            setHighlightCategories(newCategories);
            setActiveCategoryId(newCategories[0].id);
        }
        setHighlightInput('');
      } else {
        alert("AI未能识别到有效内容，请重试或更换关键词。");
      }
      
    } catch (error) {
      console.error("Error generating highlights:", error);
      alert("AI 服务暂时繁忙，请稍后再试。");
    } finally {
      setIsGeneratingHighlights(false);
    }
  };

  const sendMessageInternal = async (messageText: string) => {
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: messageText };
    setChatMessages(prev => [...prev, userMsg]);
    setIsThinking(true);

    // Context-aware prompt
    const currentTranscriptLine = [...currentLesson.transcript].reverse().find(t => t.time <= currentTime)?.text || "";
    const contextPrompt = `
      Context: The user is watching a video titled "${currentLesson.title}".
      Current timestamp: ${formatTime(currentTime)}.
      Current transcript line: "${currentTranscriptLine}".
      User Question: ${userMsg.text}
    `;

    let replyText = '';
    if (chatSessionRef.current) {
      replyText = await sendMessageToAI(chatSessionRef.current, contextPrompt);
    } else {
      replyText = "AI 服务连接中断。";
    }

    setChatMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: replyText }]);
    setIsThinking(false);
  }

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    await sendMessageInternal(chatInput);
    setChatInput('');
  };

  // --- Text Selection Handler ---
  const handleTranscriptMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSelectionMenu(null);
      return;
    }

    const text = selection.toString().trim();
    if (!text) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setSelectionMenu({
      x: rect.left + (rect.width / 2),
      y: rect.top - 10,
      text: text
    });
  };

  const handleMenuExplain = () => {
    if (!selectionMenu) return;
    setActiveTab('chat');
    sendMessageInternal(`请解释一下这段话：“${selectionMenu.text}”`);
    setSelectionMenu(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleMenuNote = () => {
    if (!selectionMenu) return;
    setActiveTab('notes');
    setCurrentQuote(selectionMenu.text);
    setSelectionMenu(null);
    window.getSelection()?.removeAllRanges();
  };

  // --- Export Transcript Handler ---
  const handleExportTranscript = () => {
    if (!hasPermission(currentUser, 'export_transcript')) {
      setShowUpgradeModal(true);
      return;
    }
    
    const title = `# ${currentLesson.title}\n\n`;
    const content = currentLesson.transcript
      .map(t => `[${formatTime(t.time)}] ${t.text}`)
      .join('\n\n');
      
    const fullText = title + content;
    const blob = new Blob([fullText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentLesson.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_transcript.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Extract color for visualization style
  const getHighlightStyles = (colorClass: string) => {
      const borderColor = colorClass.match(/border-([a-z]+)-(\d+)/);
      const bgColor = colorClass.match(/bg-([a-z]+)-(\d+)/);
      const textColor = colorClass.match(/text-([a-z]+)-(\d+)/);
      
      // Default Blue
      let hexColor = '#3b82f6'; 
      
      if (colorClass.includes('purple') || colorClass.includes('fuchsia')) hexColor = '#a855f7';
      else if (colorClass.includes('green') || colorClass.includes('emerald')) hexColor = '#22c55e';
      else if (colorClass.includes('orange') || colorClass.includes('amber')) hexColor = '#f97316';
      else if (colorClass.includes('red') || colorClass.includes('rose')) hexColor = '#ef4444';
      else if (colorClass.includes('indigo') || colorClass.includes('violet')) hexColor = '#6366f1';
      
      return { hexColor, className: colorClass };
  };

  // Helper for Category Icon
  const getCategoryIcon = (type: HighlightCategory['type']) => {
      switch(type) {
          case 'concept': return <Lightbulb size={14} />;
          case 'tactic': return <Wrench size={14} />;
          case 'case': return <Layers size={14} />;
          case 'custom': return <Target size={14} />;
          default: return <Star size={14} />;
      }
  };

  return (
    <div className="h-full flex flex-col lg:flex-row bg-slate-50 overflow-hidden font-sans relative">
      
      {/* Selection Popup Menu */}
      {selectionMenu && (
        <div 
          className="fixed z-50 bg-slate-900 text-white rounded-lg shadow-xl flex items-center p-1 gap-1 transform -translate-x-1/2 -translate-y-full animate-in zoom-in duration-200"
          style={{ left: selectionMenu.x, top: selectionMenu.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button 
            onClick={handleMenuExplain}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-700 rounded-md text-xs font-medium transition-colors"
          >
            <MessageCircle size={14} />
            AI 解释
          </button>
          <div className="w-px h-4 bg-slate-700"></div>
          <button 
            onClick={handleMenuNote}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-700 rounded-md text-xs font-medium transition-colors"
          >
            <CheckSquare size={14} />
            记笔记
          </button>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900"></div>
        </div>
      )}
      
      {/* --- LEFT COLUMN: Video Player (70%) --- */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200 bg-white">
        
        {/* Back Button (Header) */}
        <div className="p-4 border-b border-slate-200 bg-white flex items-center gap-3">
            <button 
                onClick={() => navigate(AppRoute.SOLUTION)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-700"
            >
                <ArrowLeft size={20} />
            </button>
            <div>
                <h1 className="text-lg font-bold text-slate-900 line-clamp-1">{currentLesson.title}</h1>
                <div className="text-xs text-slate-400">解决方案库 / 课程详情</div>
            </div>
        </div>

        {/* Video Player Container */}
        <div 
          ref={playerContainerRef}
          className={`bg-black w-full relative group shadow-lg z-30 flex items-center justify-center ${isFullScreen ? 'fixed inset-0 z-50 h-screen' : 'aspect-video'}`}
        >
           {currentLesson.videoUrl ? (
             <video
               ref={videoRef}
               src={currentLesson.videoUrl}
               className={`w-full h-full ${isFullScreen ? 'object-contain' : 'object-contain'}`}
               poster={currentLesson.thumbnail}
               onClick={handlePlayPause}
               onTimeUpdate={() => {
                 if(videoRef.current) setCurrentTime(videoRef.current.currentTime);
               }}
               onEnded={() => setIsPlaying(false)}
             />
           ) : (
             <img 
                src={currentLesson.thumbnail} 
                alt={currentLesson.title}
                className={`w-full h-full opacity-90 bg-black ${isFullScreen ? 'object-contain' : 'object-contain'}`}
              />
           )}
            
            {/* Custom Controls Overlay */}
            <div className="absolute inset-0 flex flex-col justify-between transition-opacity duration-300">
              
              {/* Center Play Button */}
              <div className="flex-1 flex items-center justify-center group-hover:opacity-100 opacity-0 transition-opacity">
                <button 
                  onClick={handlePlayPause}
                  className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/30 hover:scale-105 transition-all shadow-xl border border-white/10"
                >
                  {isPlaying ? <Pause size={36} className="text-white fill-current" /> : <Play size={36} className="text-white fill-current ml-2" />}
                </button>
              </div>

              {/* Bottom Bar */}
              <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 pt-12 pointer-events-none">
                
                {/* Progress Bar Row */}
                <div className="mb-3 flex items-center gap-0 pointer-events-auto">
                  <div 
                    className="w-full h-1.5 bg-white/30 rounded-full cursor-pointer relative group/progress hover:h-2 transition-all"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const percent = x / rect.width;
                      handleJumpToTime(Math.floor(percent * currentLesson.durationSec));
                    }}
                  >
                    <div 
                      className="h-full bg-blue-500 rounded-full relative transition-all" 
                      style={{ width: `${(currentTime / currentLesson.durationSec) * 100}%` }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover/progress:opacity-100 transition-opacity transform scale-125"></div>
                    </div>
                  </div>
                </div>

                {/* Controls Row */}
                <div className="flex items-center justify-between text-white pointer-events-auto">
                  
                  {/* Left Controls */}
                  <div className="flex items-center gap-4">
                    <button onClick={handlePlayPause} className="hover:text-blue-400 transition-colors">
                        {isPlaying ? <Pause size={20} className="fill-current" /> : <Play size={20} className="fill-current" />}
                    </button>
                    <span className="text-xs font-medium tracking-wide font-mono">
                      {formatTime(currentTime)} / {currentLesson.duration}
                    </span>
                  </div>

                  {/* Right Controls */}
                  <div className="flex items-center gap-4 relative">
                    {/* Speed Control */}
                    <div className="relative">
                        <button 
                          onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                          className="text-xs font-bold hover:bg-white/20 px-2 py-1 rounded transition-colors flex items-center gap-1 w-12 justify-center"
                        >
                          {playbackRate}x
                        </button>
                        {showSpeedMenu && (
                          <div className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur border border-white/10 rounded-lg overflow-hidden flex flex-col text-xs text-white z-50 min-w-[80px] shadow-xl animate-in slide-in-from-bottom-2 fade-in">
                            {[2.0, 1.5, 1.25, 1.0, 0.8].map(rate => (
                              <button
                                key={rate}
                                onClick={(e) => { e.stopPropagation(); setPlaybackRate(rate); setShowSpeedMenu(false); }}
                                className={`px-3 py-2 hover:bg-blue-600/50 text-center transition-colors ${playbackRate === rate ? 'text-blue-400 font-bold bg-white/5' : ''}`}
                              >
                                {rate.toFixed(1)}x
                              </button>
                            ))}
                          </div>
                        )}
                    </div>

                    {/* Fullscreen Control */}
                    <button onClick={handleToggleFullScreen} className="hover:text-blue-400 transition-colors">
                      {isFullScreen ? <Minimize size={20} /> : <Maximize size={20} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
        </div>

        {/* Video Info & Highlights (Scrollable in flex column) */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
            <div className="p-6 border-b border-slate-200 bg-white">
                
                {/* Topic Input Section */}
                <div className="flex gap-4 items-center mb-4">
                    <div className="relative flex-1">
                        {highlightInput.trim() ? (
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        ) : (
                            <Wand2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
                        )}
                        <input 
                            className="w-full pl-10 pr-24 py-3 text-sm border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none placeholder:text-slate-400"
                            placeholder="输入主题 (如“薪资”), 或留空进行 AI 全篇多维度解析..."
                            value={highlightInput}
                            onChange={(e) => setHighlightInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleGenerateHighlights()}
                            disabled={isGeneratingHighlights}
                        />
                        <button 
                            onClick={handleGenerateHighlights}
                            disabled={isGeneratingHighlights}
                            className={`absolute right-1.5 top-1.5 bottom-1.5 px-4 text-xs font-bold rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1 ${
                                isGeneratingHighlights ? 'bg-slate-200 text-slate-500' :
                                highlightInput.trim() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            }`}
                        >
                            {isGeneratingHighlights ? <Loader2 size={14} className="animate-spin" /> : (
                                highlightInput.trim() ? (
                                    <>生成高亮</>
                                ) : (
                                    <><Sparkles size={12} /> AI 全篇解析</>
                                )
                            )}
                        </button>
                    </div>
                </div>

                {/* Category Pills */}
                {highlightCategories.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-6 scrollbar-hide animate-in slide-in-from-top-2">
                        {highlightCategories.map(cat => {
                            const isActive = activeCategoryId === cat.id;
                            let colorClass = 'bg-slate-100 text-slate-500 hover:bg-slate-200';
                            if (isActive) {
                                switch(cat.type) {
                                    case 'concept': colorClass = 'bg-blue-600 text-white shadow-md shadow-blue-200'; break;
                                    case 'tactic': colorClass = 'bg-green-600 text-white shadow-md shadow-green-200'; break;
                                    case 'case': colorClass = 'bg-orange-600 text-white shadow-md shadow-orange-200'; break;
                                    case 'custom': colorClass = 'bg-purple-600 text-white shadow-md shadow-purple-200'; break;
                                    default: colorClass = 'bg-slate-800 text-white shadow-md';
                                }
                            }

                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategoryId(cat.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap border border-transparent ${colorClass}`}
                                >
                                    {getCategoryIcon(cat.type)}
                                    {cat.label}
                                    <span className={`ml-1 opacity-60 text-[10px]`}>{cat.items.length}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Stylized Visual Highlight Timeline */}
                <div className="mb-8 relative px-2">
                    <div className="h-1.5 w-full bg-slate-200 rounded-full relative overflow-hidden">
                        <div className="absolute top-0 left-0 bottom-0 bg-slate-300/50 w-full"></div>
                    </div>
                    
                    {/* Render highlight markers based on ACTIVE category */}
                    {activeHighlights.map((hl, idx) => {
                        const leftPercent = (hl.time / currentLesson.durationSec) * 100;
                        const { hexColor, className } = getHighlightStyles(hl.color);
                        return (
                            <div 
                                key={idx}
                                className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 cursor-pointer group z-10"
                                style={{ left: `${leftPercent}%`, top: '3px' }} // Align center of 1.5 (0.75) -> approx
                                onClick={() => handleJumpToTime(hl.time)}
                            >
                                <div className={`w-4 h-4 lg:w-6 lg:h-6 rounded-full flex items-center justify-center shadow-md border-2 bg-white transition-transform group-hover:scale-125 ${className.split(' ').filter(c=>c.startsWith('border')).join(' ')}`}>
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: hexColor }}></div>
                                </div>
                                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg z-20">
                                    {hl.label} ({formatTime(hl.time)})
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Highlights List View */}
                <div className="relative">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <ListVideo size={16} /> 
                            {highlightCategories.find(c => c.id === activeCategoryId)?.label || '精彩片段'} 
                            <span className="text-slate-400 font-normal text-xs">列表</span>
                        </h3>
                        {activeHighlights.length > 0 && (
                            <button 
                                onClick={handlePlayAll}
                                className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
                            >
                                <Play size={12} className="fill-current" /> 顺序播放
                            </button>
                        )}
                    </div>

                    <div className="space-y-3">
                        {activeHighlights.length === 0 && <div className="text-center text-slate-400 py-8 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">暂无高亮标记，请尝试 AI 解析</div>}
                        {activeHighlights.map((hl, idx) => {
                            const { hexColor, className } = getHighlightStyles(hl.color);
                            const bgClass = className.split(' ').find(c => c.startsWith('bg-')) || 'bg-slate-100';
                            const isCurrent = Math.abs(currentTime - hl.time) < 5; // Highlight active item if time matches

                            return (
                                <div 
                                    key={idx} 
                                    onClick={() => handleJumpToTime(hl.time)}
                                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                                        isCurrent ? 'border-blue-400 shadow-md scale-[1.02]' : 'border-transparent hover:border-slate-200 hover:shadow-sm'
                                    } ${bgClass} bg-opacity-30 hover:bg-opacity-50`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                                            <span className="text-xs font-bold" style={{ color: hexColor }}>{idx + 1}</span>
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-800">{hl.label}</div>
                                            <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">点击跳转至 {formatTime(hl.time)}</div>
                                        </div>
                                    </div>
                                    <div className="text-xs font-mono text-slate-500 bg-white/80 px-2 py-1 rounded">
                                        {formatTime(hl.time)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>

      </div>

      {/* --- RIGHT COLUMN: Transcript, AI Chat, Notes (30%) --- */}
      <div className="w-full lg:w-[380px] xl:w-[420px] flex flex-col border-l border-slate-200 bg-white shrink-0 h-[500px] lg:h-auto">
        {/* Tabs Header */}
        <div className="flex border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('transcript')}
            className={`flex-1 py-4 text-sm font-medium transition-colors relative ${
              activeTab === 'transcript' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FileText size={16} /> 文字稿
            </div>
            {activeTab === 'transcript' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>}
          </button>
          <button 
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-4 text-sm font-medium transition-colors relative ${
              activeTab === 'chat' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <MessageCircle size={16} /> 聊天
            </div>
            {activeTab === 'chat' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>}
          </button>
          <button 
            onClick={() => setActiveTab('notes')}
            className={`flex-1 py-4 text-sm font-medium transition-colors relative ${
              activeTab === 'notes' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <PenTool size={16} /> 笔记
            </div>
            {activeTab === 'notes' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>}
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden relative bg-slate-50/50">
          
          {/* 1. Transcript Tab */}
          {activeTab === 'transcript' && (
            <div className="absolute inset-0 flex flex-col">
               {/* Header */}
               <div className="flex justify-between items-center px-6 py-3 border-b border-slate-100 bg-white sticky top-0 z-10">
                  <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      <span className="text-xs font-bold text-slate-500">AI 生成内容</span>
                  </div>
                  <button
                    onClick={handleExportTranscript}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-md transition-colors border border-slate-200 group"
                  >
                    <Download size={14} className="text-slate-400 group-hover:text-slate-600" />
                    <span>导出 .md</span>
                    {!hasPermission(currentUser, 'export_transcript') && (
                        <span className="bg-blue-600 text-white text-[10px] px-1 py-0.5 rounded font-bold ml-1">PRO</span>
                    )}
                  </button>
               </div>

               {/* Content */}
               <div className="flex-1 overflow-y-auto p-6" ref={transcriptContainerRef} onMouseUp={handleTranscriptMouseUp}>
                 <div className="space-y-6">
                    {currentLesson.transcript.map((line, idx) => {
                    const isActive = currentTime >= line.time &&
                        (idx === currentLesson.transcript.length - 1 || currentTime < currentLesson.transcript[idx + 1].time);

                    return (
                        <div
                        key={`transcript-${idx}`}
                        className={`flex gap-4 group transition-opacity duration-500 cursor-pointer ${isActive ? 'active-transcript opacity-100' : 'opacity-60 hover:opacity-90'}`}
                        onClick={() => handleJumpToTime(line.time)}
                        >
                        <span
                            className={`text-xs font-mono mt-1 shrink-0 w-10 text-right ${isActive ? 'text-blue-600 font-bold' : 'text-slate-400'}`}
                        >
                            {formatTime(line.time)}
                        </span>
                        <p className={`text-sm leading-relaxed ${isActive ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>
                            {line.text}
                        </p>
                        </div>
                    );
                    })}
                 </div>
               </div>
            </div>
          )}

          {/* 2. AI Chat Tab */}
          {activeTab === 'chat' && (
            <div className="absolute inset-0 flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-xl text-sm leading-relaxed shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                    }`}>
                      {msg.text}
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
                    placeholder="向 AI 提问..."
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

          {/* 3. Notes Tab */}
          {activeTab === 'notes' && (
            <div className="absolute inset-0 flex flex-col">
              <div className="p-4 border-b border-slate-200 bg-white">
                {/* Active Quote Preview */}
                {currentQuote && (
                    <div className="mb-3 p-3 bg-slate-50 border-l-4 border-blue-500 rounded-r-lg relative group animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Quote size={12} className="text-blue-500 fill-current" />
                            <span className="text-[10px] font-bold text-blue-600 uppercase">字幕摘录</span>
                        </div>
                        <p className="text-xs text-slate-600 italic line-clamp-3">“{currentQuote}”</p>
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
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder={currentQuote ? "针对这段字幕，您的想法是..." : "记录阅读心得..."}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none h-20"
                  />
                  <button
                    onClick={() => handleSaveNote()}
                    disabled={!noteInput.trim()}
                    className="absolute bottom-2 right-2 px-3 py-1 bg-slate-800 text-white text-xs font-bold rounded-md hover:bg-slate-700 disabled:opacity-50 transition-colors"
                  >
                    保存笔记
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {notes.length === 0 && (
                  <div className="text-center text-slate-400 mt-10">
                    <Bookmark size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-sm">暂无笔记</p>
                    <p className="text-xs mt-1">在视频播放时随时记录灵感</p>
                  </div>
                )}
                {notes.map((note) => (
                  <div key={note.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors group cursor-pointer" onClick={() => handleJumpToTime(note.timestamp)}>
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-1 text-blue-600 font-mono text-xs font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                        <Play size={10} className="fill-current" />
                        {formatTime(note.timestamp)}
                      </div>
                      <button className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                        <CheckSquare size={14} />
                      </button>
                    </div>
                    
                    {note.quote && (
                        <div className="mb-2 pl-2 border-l-2 border-slate-200">
                             <p className="text-xs text-slate-400 italic line-clamp-2">“{note.quote}”</p>
                        </div>
                    )}
                    <p className="text-sm text-slate-700 leading-relaxed">{note.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* --- Upgrade Modal --- */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 relative p-8 border-t-4 border-orange-500">
            <button
                onClick={() => setShowUpgradeModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
                <X size={24} />
            </button>

            <div className="mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-xs font-bold mb-4 border border-orange-100 shadow-sm">
                <Crown size={14} className="fill-current" /> 专业技能
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-3 leading-tight">导出成绩单是专业版的一项特权。</h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                升级即可解锁下载成绩单功能，提高分析限额，并在更短的时间内完成更多工作。
                </p>
            </div>

            <div className="space-y-4 mb-8 bg-slate-50 p-5 rounded-xl border border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">PRO版包含哪些内容？</h3>
                <ul className="space-y-3">
                    <li className="flex items-start gap-3 text-sm text-slate-700 font-medium">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2"></div>
                        无限量导出成绩单
                    </li>
                    <li className="flex items-start gap-3 text-sm text-slate-700 font-medium">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2"></div>
                        每月进行 100 次 AI 视频分析
                    </li>
                    <li className="flex items-start gap-3 text-sm text-slate-700 font-medium">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2"></div>
                        精彩片段、已保存的笔记和充值积分
                    </li>
                </ul>
            </div>

            <div className="flex items-center justify-between pt-2">
                <button
                    onClick={() => setShowUpgradeModal(false)}
                    className="text-slate-500 text-sm hover:text-slate-800 font-medium px-4"
                >
                    也许以后
                </button>
                <button
                    onClick={() => navigate(AppRoute.PLANS)}
                    className="bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-slate-900/20"
                >
                    升级到专业版 <ArrowRight size={16} />
                </button>
            </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default SolutionDetail;
