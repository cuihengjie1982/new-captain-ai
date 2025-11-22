

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppRoute, BlogPost, IntroVideo, DiagnosisIssue, AboutUsInfo } from '../types';
import { ArrowRight, Clock, ChevronDown, Stethoscope, Play, Pause, Maximize, Minimize, Volume2, VolumeX, Settings, Building2, Users, ExternalLink } from 'lucide-react';
import { getBlogPosts, getIntroVideo, getDiagnosisIssues, getAboutUsInfo } from '../services/contentService';

const Blog: React.FC = () => {
  const navigate = useNavigate();
  
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [introVideo, setIntroVideo] = useState<IntroVideo | null>(null);
  const [diagnosisIssues, setDiagnosisIssues] = useState<DiagnosisIssue[]>([]);
  const [aboutUs, setAboutUs] = useState<AboutUsInfo | null>(null);

  useEffect(() => {
    setPosts(getBlogPosts());
    setDiagnosisIssues(getDiagnosisIssues());
    setAboutUs(getAboutUsInfo());
    const video = getIntroVideo();
    if (video && video.isVisible) {
      setIntroVideo(video);
    }
  }, []);
  
  // Diagnosis Widget State
  // Default to first issue if available, else fallback string
  const [selectedIssue, setSelectedIssue] = useState('');
  
  useEffect(() => {
      if (diagnosisIssues.length > 0) {
          setSelectedIssue(diagnosisIssues[0].title);
      } else {
          setSelectedIssue('核心人才留存');
      }
  }, [diagnosisIssues]);

  const [customIssue, setCustomIssue] = useState('');

  const handleStartDiagnosis = () => {
    const issueToSend = selectedIssue === 'other' ? customIssue : selectedIssue;
    navigate(AppRoute.DIAGNOSIS, { 
      state: { initialIssue: issueToSend } 
    });
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

          {/* Interactive Diagnosis Widget */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
            <div className="flex flex-col md:flex-row">
                {/* Left: Visual/Title */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-800 p-8 text-white md:w-1/2 flex flex-col justify-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur rounded-full text-xs font-semibold mb-4 self-start border border-white/20">
                      <Stethoscope size={14} />
                      <span>智能诊断工具</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-4 leading-tight">您在苦恼些什么？</h2>
                  <p className="text-blue-100 opacity-90">
                      不要等到更加恶化了才发现问题。填写右侧表单，AI 和专家团队将立即为您分析团队现状并提供解决方案。
                  </p>
                </div>

                {/* Right: Interactive Form */}
                <div className="p-8 md:w-1/2 bg-white flex flex-col justify-center">
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                      您目前最头疼的问题是：
                  </label>
                  
                  <div className="relative mb-4">
                      <select 
                        value={selectedIssue}
                        onChange={(e) => setSelectedIssue(e.target.value)}
                        className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-3 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                      >
                        {diagnosisIssues.map(issue => (
                            <option key={issue.id} value={issue.title}>{issue.title}</option>
                        ))}
                        <option value="other">其他原因...</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                        <ChevronDown size={16} />
                      </div>
                  </div>

                  {selectedIssue === 'other' && (
                    <input
                        type="text"
                        value={customIssue}
                        onChange={(e) => setCustomIssue(e.target.value)}
                        placeholder="请描述具体问题..."
                        className="w-full mb-4 bg-slate-50 border border-slate-200 text-slate-700 py-3 px-4 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  )}

                  <button 
                    onClick={handleStartDiagnosis}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center shadow-lg shadow-blue-600/20"
                  >
                    开始诊断 <ArrowRight size={18} className="ml-2" />
                  </button>
                </div>
            </div>
          </div>

          {/* Blog Posts List */}
          {posts.map((post) => (
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
              </div>
              
              <div className="mt-12 pt-8 border-t border-slate-800 text-center text-slate-500 text-xs">
                 © 2024 Captain AI / CMBPO. All rights reserved.
              </div>
           </div>
        </footer>
      )}
    </div>
  );
};

export default Blog;