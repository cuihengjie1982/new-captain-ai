
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppRoute, BlogPost, IntroVideo, DiagnosisIssue, AboutUsInfo, DiagnosisWidgetConfig } from '../types';
import { ArrowRight, Clock, ChevronDown, Stethoscope, Play, Pause, Maximize, Minimize, Volume2, VolumeX, Settings, Building2, Users, ExternalLink, Check, X } from 'lucide-react';
import { getBlogPosts, getIntroVideo, getDiagnosisIssues, getAboutUsInfo, getPaymentQRCode, getDiagnosisWidgetConfig } from '../services/contentService';
import { saveDiagnosisSubmission } from '../services/userDataService';

const Blog: React.FC = () => {
  const navigate = useNavigate();
  
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [introVideo, setIntroVideo] = useState<IntroVideo | null>(null);
  const [diagnosisIssues, setDiagnosisIssues] = useState<DiagnosisIssue[]>([]);
  const [aboutUs, setAboutUs] = useState<AboutUsInfo | null>(null);
  const [qrCode, setQrCode] = useState('');
  const [widgetConfig, setWidgetConfig] = useState<DiagnosisWidgetConfig>({title: '', description: '', highlightText: ''});

  // Pagination State
  const [visibleCount, setVisibleCount] = useState(6);

  useEffect(() => {
    setPosts(getBlogPosts());
    setDiagnosisIssues(getDiagnosisIssues());
    setAboutUs(getAboutUsInfo());
    setQrCode(getPaymentQRCode());
    setWidgetConfig(getDiagnosisWidgetConfig());
    const video = getIntroVideo();
    if (video && video.isVisible) {
      setIntroVideo(video);
    }
  }, []);
  
  // Diagnosis Widget State
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [customIssue, setCustomIssue] = useState('');
  const [isIssueDropdownOpen, setIsIssueDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Modal for Other Issue
  const [showOtherModal, setShowOtherModal] = useState(false);

  // Click outside to close dropdown
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
              setIsIssueDropdownOpen(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleIssue = (title: string) => {
      if (title === 'other') {
          if (selectedIssues.includes('other')) {
              setSelectedIssues(selectedIssues.filter(i => i !== 'other'));
              // Don't clear customIssue immediately to allow re-selection without re-typing, 
              // or clear it if you prefer strict reset. Keeping it is often better UX.
          } else {
              setShowOtherModal(true); 
              setIsIssueDropdownOpen(false); 
          }
      } else {
          if (selectedIssues.includes(title)) {
              setSelectedIssues(selectedIssues.filter(i => i !== title));
          } else {
              setSelectedIssues([...selectedIssues, title]);
          }
      }
  };

  const handleConfirmOtherIssue = () => {
      if (customIssue.trim()) {
          if (!selectedIssues.includes('other')) {
              setSelectedIssues([...selectedIssues, 'other']);
          }
          setShowOtherModal(false);
      } else {
          // If empty, just close. Optionally ensure 'other' is NOT in selectedIssues
          setSelectedIssues(selectedIssues.filter(i => i !== 'other'));
          setShowOtherModal(false);
      }
  };

  const handleCancelOtherIssue = () => {
      // If cancelling, and 'other' was not previously selected (implied by flow), ensure it remains unselected
      // If it was selected, we might want to leave it or remove it. Assuming remove for "Cancel add".
      if (!selectedIssues.includes('other')) {
          setCustomIssue('');
      }
      setShowOtherModal(false);
  };

  const handleStartDiagnosis = () => {
    const currentUser = JSON.parse(localStorage.getItem('captainUser') || '{}');
    
    // Construct the combined issue text for AI context
    let combinedIssueText = selectedIssues.filter(i => i !== 'other').join('，');
    
    // Append custom issue if 'other' is selected AND text is provided
    if (selectedIssues.includes('other') && customIssue.trim()) {
        if (combinedIssueText) {
            combinedIssueText += `，以及${customIssue}`;
        } else {
            combinedIssueText = customIssue;
        }
    }

    // Fallback if user selected nothing (should be disabled, but as safeguard)
    if (!combinedIssueText) {
        if (diagnosisIssues.length > 0) combinedIssueText = diagnosisIssues[0].title;
        else combinedIssueText = "核心人才留存";
    }

    // Save submission
    saveDiagnosisSubmission({
        id: Date.now().toString(),
        selectedIssues: selectedIssues,
        customIssue: selectedIssues.includes('other') ? customIssue : undefined,
        submittedAt: new Date().toLocaleString('zh-CN'),
        user: currentUser.name || 'Guest',
        userId: currentUser.id,
        status: 'new'
    });

    // Navigate to Diagnosis with state
    navigate(AppRoute.DIAGNOSIS, { 
      state: { initialIssue: combinedIssueText } 
    });
  };

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 6);
  };

  // --- Video Player Logic ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const duration = videoRef.current.duration;
      setProgress((current / duration) * 100);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = x / rect.width;
      videoRef.current.currentTime = ratio * videoRef.current.duration;
    }
  };

  const handleToggleFullScreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  const handleSpeedChange = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
      setShowSpeedMenu(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="p-6 md:p-8 max-w-7xl mx-auto flex-1 w-full">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-slate-900">Captain's Log</h1>
          <p className="text-slate-500 mt-2">运营卓越的最新洞察</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          
          {/* Intro Video Section - 16:9 Aspect Ratio */}
          {introVideo && introVideo.isVisible && (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 mb-4">
                <div 
                  ref={playerContainerRef}
                  className={`relative rounded-2xl overflow-hidden shadow-xl bg-black group w-full ${isFullScreen ? 'fixed inset-0 z-50 h-screen rounded-none' : 'aspect-video'}`}
                >
                  <video 
                    ref={videoRef}
                    src={introVideo.url}
                    className="w-full h-full object-cover"
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={() => setIsPlaying(false)}
                    onClick={handlePlayPause}
                    poster={introVideo.thumbnail}
                  />
                  
                  {/* Center Play Button Overlay */}
                  {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity">
                        <button 
                          onClick={handlePlayPause}
                          className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/30 hover:scale-105 transition-all shadow-xl border border-white/10"
                        >
                          <Play size={32} className="text-white fill-current ml-1" />
                        </button>
                    </div>
                  )}

                  {/* Title Overlay */}
                  <div className={`absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-300 ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                      <h3 className="text-white font-bold text-lg">{introVideo.title}</h3>
                      {introVideo.duration && <span className="text-white/80 text-xs font-mono mt-1 block">{introVideo.duration}</span>}
                  </div>

                  {/* Controls Bar */}
                  <div className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                      {/* Progress Bar */}
                      <div 
                        className="w-full h-1.5 bg-white/30 rounded-full mb-4 cursor-pointer hover:h-2 transition-all"
                        onClick={handleSeek}
                      >
                        <div className="h-full bg-blue-500 rounded-full relative" style={{ width: `${progress}%` }}>
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow scale-0 group-hover:scale-100 transition-transform"></div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-white">
                        <div className="flex items-center gap-4">
                            <button onClick={handlePlayPause} className="hover:text-blue-400 transition-colors">
                              {isPlaying ? <Pause size={20} className="fill-current" /> : <Play size={20} className="fill-current" />}
                            </button>
                            
                            <button onClick={() => {
                              if(videoRef.current) {
                                videoRef.current.muted = !isMuted;
                                setIsMuted(!isMuted);
                              }
                            }} className="hover:text-blue-400">
                              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Speed Control */}
                            <div className="relative">
                                <button 
                                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                                  className="px-2 py-1 text-xs font-bold bg-white/10 rounded hover:bg-white/20 transition-colors flex items-center gap-1 min-w-[3rem] justify-center"
                                >
                                  {playbackRate}x
                                </button>
                                {showSpeedMenu && (
                                  <div className="absolute bottom-full right-0 mb-2 bg-black/90 border border-white/10 rounded-lg overflow-hidden flex flex-col text-xs min-w-[80px]">
                                    {[0.5, 1.0, 1.25, 1.5, 2.0].map(rate => (
                                      <button
                                        key={rate}
                                        onClick={() => handleSpeedChange(rate)}
                                        className={`px-3 py-2 hover:bg-blue-600/50 text-left ${playbackRate === rate ? 'text-blue-400 font-bold' : 'text-white'}`}
                                      >
                                        {rate}x
                                      </button>
                                    ))}
                                  </div>
                                )}
                            </div>

                            <button onClick={handleToggleFullScreen} className="hover:text-blue-400 transition-colors">
                              {isFullScreen ? <Minimize size={20} /> : <Maximize size={20} />}
                            </button>
                        </div>
                      </div>
                  </div>
                </div>
            </div>
          )}

          {/* Interactive Diagnosis Widget - Redesigned & Compact Layout */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-white rounded-2xl shadow-xl border border-slate-100 relative z-10 overflow-hidden">
            <div className="flex flex-col md:flex-row min-h-[340px]">
                
                {/* Left: Visual/Title (35%) - Compact & Elegant */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-800 p-8 text-white md:w-[35%] flex flex-col justify-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                  <div className="relative z-10">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur rounded-full text-xs font-semibold mb-4 self-start border border-white/20 shadow-sm">
                          <Stethoscope size={14} />
                          <span>{widgetConfig.highlightText || '智能诊断工具'}</span>
                      </div>
                      <h2 className="text-2xl font-bold mb-3 leading-tight tracking-tight">{widgetConfig.title || '您在苦恼些什么？'}</h2>
                      <p className="text-blue-100 opacity-90 text-sm leading-relaxed">
                          {widgetConfig.description || '不要等到更加恶化了才发现问题。填写右侧表单，AI 和专家团队将立即为您分析团队现状并提供解决方案。'}
                      </p>
                  </div>
                </div>

                {/* Right: Interactive Form (65%) - Flex Layout for spacing */}
                <div className="p-6 md:p-8 md:w-[65%] bg-white flex flex-col h-full justify-between">
                  
                  {/* Top Section: Input */}
                  <div>
                      <label className="block text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                          您目前最头疼的问题是 (可多选)：
                      </label>
                      
                      <div className="relative mb-4" ref={dropdownRef}>
                          <button 
                            onClick={() => setIsIssueDropdownOpen(!isIssueDropdownOpen)}
                            className="w-full text-left bg-slate-50 border border-slate-200 hover:border-blue-300 text-slate-700 py-3.5 px-4 rounded-xl leading-tight focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all flex justify-between items-center"
                          >
                             <span className={`truncate ${selectedIssues.length === 0 ? 'text-slate-400' : 'text-slate-800 font-medium'}`}>
                                 {selectedIssues.length === 0 ? '点击选择您遇到的问题...' : 
                                    selectedIssues.map(i => i === 'other' ? '其他' : i).join(', ')
                                 }
                             </span>
                             <ChevronDown size={18} className={`text-slate-400 ml-2 flex-shrink-0 transition-transform duration-200 ${isIssueDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>

                          {isIssueDropdownOpen && (
                              <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 origin-top">
                                  {diagnosisIssues.map(issue => (
                                      <div 
                                        key={issue.id} 
                                        onClick={() => toggleIssue(issue.title)}
                                        className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-center gap-3 transition-colors border-b border-slate-50 last:border-0"
                                      >
                                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selectedIssues.includes(issue.title) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                                              {selectedIssues.includes(issue.title) && <Check size={10} className="text-white" />}
                                          </div>
                                          <span className="text-sm text-slate-700">{issue.title}</span>
                                      </div>
                                  ))}
                                  <div 
                                    onClick={() => toggleIssue('other')}
                                    className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-center gap-3 transition-colors bg-slate-50/50"
                                  >
                                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selectedIssues.includes('other') ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                                          {selectedIssues.includes('other') && <Check size={10} className="text-white" />}
                                      </div>
                                      <span className="text-sm font-medium text-slate-700">其他 (填写具体问题...)</span>
                                  </div>
                              </div>
                          )}
                      </div>

                      {/* Display Selected Custom Issue Text */}
                      {selectedIssues.includes('other') && customIssue && (
                          <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800 flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
                              <span className="font-bold flex-shrink-0">其他:</span>
                              <span className="break-all line-clamp-2">{customIssue}</span>
                              <button onClick={() => setShowOtherModal(true)} className="ml-auto text-blue-600 underline text-xs whitespace-nowrap">修改</button>
                          </div>
                      )}
                  </div>

                  {/* Bottom Section: Button */}
                  <div className="mt-auto pt-4">
                      <button 
                        onClick={handleStartDiagnosis}
                        disabled={selectedIssues.length === 0}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-5 rounded-xl transition-all flex items-center justify-center shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transform hover:-translate-y-0.5 active:translate-y-0"
                      >
                        开始 AI 智能诊断 <ArrowRight size={18} className="ml-2" />
                      </button>
                      <p className="text-center text-xs text-slate-400 mt-3">
                          AI 助手将基于您的选择生成定制化分析报告
                      </p>
                  </div>
                </div>
            </div>
          </div>

          {/* Blog Posts List - with Limit */}
          {posts.slice(0, visibleCount).map((post) => (
            <Link 
              to={`/blog/${post.id}`} 
              key={post.id} 
              className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-slate-100 group block"
            >
              <div className="h-48 overflow-hidden relative">
                <img 
                  src={post.thumbnail} 
                  alt={post.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-12">
                  <span className="text-white text-xs font-medium bg-black/30 backdrop-blur px-2 py-1 rounded">
                    {post.author}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center text-slate-400 text-xs mb-3">
                  <Clock size={14} className="mr-1" />
                  {post.readTime}
                  <span className="mx-2">•</span>
                  {post.date}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
                  {post.title}
                </h3>
                <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed">
                  {post.summary}
                </p>
              </div>
            </Link>
          ))}

          {/* Load More Button */}
          {visibleCount < posts.length && (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-center mt-4">
              <button 
                onClick={handleLoadMore}
                className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 font-bold py-3 px-8 rounded-full shadow-sm transition-all flex items-center gap-2 group"
              >
                查看更多文章 
                <ChevronDown size={18} className="group-hover:translate-y-1 transition-transform" />
              </button>
            </div>
          )}

        </div>
      </div>
      
      {/* About Us Section */}
      {aboutUs && (
        <footer className="bg-slate-900 text-white py-12 mt-auto">
           <div className="max-w-7xl mx-auto px-6 md:px-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-20 items-start">
                 <div>
                    <div className="flex items-center gap-2 mb-4 text-blue-400">
                       <Building2 size={20} />
                       <h2 className="text-lg font-bold uppercase tracking-wider">{aboutUs.title}</h2>
                    </div>
                    <p className="text-slate-300 leading-relaxed mb-6 text-sm md:text-base">
                       {aboutUs.description}
                    </p>
                    <a 
                       href={aboutUs.websiteUrl} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold transition-colors shadow-lg shadow-blue-600/20"
                    >
                       访问我们的官网 <ExternalLink size={16} />
                    </a>
                 </div>

                 <div className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700">
                    <div className="flex flex-col sm:flex-row gap-6 items-start">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-4 text-blue-400">
                                <Users size={20} />
                                <h3 className="text-lg font-bold">专家团队</h3>
                            </div>
                            <p className="text-slate-300 text-sm leading-relaxed">
                                {aboutUs.teamInfo}
                            </p>
                            <div className="mt-6 pt-6 border-t border-slate-700 flex items-center gap-4 text-xs text-slate-500 font-mono">
                                {aboutUs.contactEmail && (
                                    <span>Email: {aboutUs.contactEmail}</span>
                                )}
                                <span>•</span>
                                <span>Since 2024</span>
                            </div>
                        </div>
                        {qrCode && (
                            <div className="bg-white p-3 rounded-xl shadow-lg flex flex-col items-center gap-2 shrink-0 border border-slate-200 hover:scale-105 transition-transform duration-300">
                                <img src={qrCode} alt="商务对接" className="w-24 h-24 object-contain" />
                                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-full border border-slate-200">
                                    扫码对接商务
                                </span>
                            </div>
                        )}
                    </div>
                 </div>
              </div>
              
              <div className="mt-12 pt-8 border-t border-slate-800 text-center text-slate-500 text-xs">
                 © 2024 Captain AI / CMBPO. All rights reserved.
              </div>
           </div>
        </footer>
      )}

      {/* Other Issue Modal */}
      {showOtherModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 animate-in zoom-in-95 relative">
                  <button 
                      onClick={handleCancelOtherIssue}
                      className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"
                  >
                      <X size={20} />
                  </button>
                  
                  <h3 className="text-xl font-bold text-slate-900 mb-4">描述其他问题</h3>
                  <p className="text-sm text-slate-500 mb-4">
                      请简要描述您目前遇到的具体运营痛点，以便我们为您提供更准确的诊断。
                  </p>
                  
                  <textarea
                      value={customIssue}
                      onChange={(e) => setCustomIssue(e.target.value)}
                      placeholder="例如：新员工培训周期太长，上线后适应慢..."
                      className="w-full h-32 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none bg-slate-50 mb-6"
                      autoFocus
                  />
                  
                  <div className="flex justify-end gap-3">
                      <button 
                          onClick={handleCancelOtherIssue}
                          className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50"
                      >
                          取消
                      </button>
                      <button 
                          onClick={handleConfirmOtherIssue}
                          disabled={!customIssue.trim()}
                          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          确认
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default Blog;
