import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppRoute, Lesson, WatchedLesson } from '../types';
import { Search, Play, Star, Clock, Video, FileText, Settings, Zap } from 'lucide-react';
import { getLessons } from '../services/courseService';
import { getWatchedHistory } from '../services/userDataService';

const MyVideos: React.FC = () => {
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [history, setHistory] = useState<WatchedLesson[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLessons(getLessons());
    setHistory(getWatchedHistory());
  }, []);

  // Filter lessons that are in history
  const watchedLessons = lessons.filter(l => history.some(h => h.lessonId === l.id));
  
  const filteredLessons = watchedLessons.filter(l => 
    l.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getProgress = (id: string) => {
    const item = history.find(h => h.lessonId === id);
    return item ? item.progress : 0;
  };

  const getWatchedTime = (id: string) => {
    const item = history.find(h => h.lessonId === id);
    return item ? item.watchedAt : '';
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">我学习过的视频</h1>
        <p className="text-slate-500 mt-2">您的学习历史已自动保存。点击任意视频即可从上次中断的地方继续观看。</p>
      </header>

      {/* Sub Navigation */}
      <div className="flex gap-1 border-b border-slate-200 mb-8 overflow-x-auto">
        <Link to={AppRoute.MY_VIDEOS} className="px-4 py-2 border-b-2 border-blue-600 text-blue-600 font-medium flex items-center gap-2">
          <Video size={18} /> 视频
        </Link>
        <Link to={AppRoute.MY_NOTES} className="px-4 py-2 border-b-2 border-transparent text-slate-500 hover:text-slate-700 flex items-center gap-2">
          <FileText size={18} /> 笔记
        </Link>
        <Link to={AppRoute.PLANS} className="px-4 py-2 border-b-2 border-transparent text-slate-500 hover:text-slate-700 flex items-center gap-2">
          <Zap size={18} /> 升级计划
        </Link>
        <Link to={AppRoute.SETTINGS} className="px-4 py-2 border-b-2 border-transparent text-slate-500 hover:text-slate-700 flex items-center gap-2">
          <Settings size={18} /> 设置
        </Link>
      </div>

      <div className="mb-6 relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text"
          placeholder="搜索您的视频..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-full focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
        />
      </div>

      {filteredLessons.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Video size={32} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-medium text-slate-700">暂无观看记录</h3>
          <p className="text-slate-400 mt-1 mb-4">前往解决方案库开始学习您的第一个课程</p>
          <Link to={AppRoute.SOLUTION} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            浏览课程
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLessons.map(lesson => (
             <div key={lesson.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all group flex flex-col">
                <div className="relative aspect-video bg-slate-900">
                   <img src={lesson.thumbnail} alt={lesson.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                   <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                      <button onClick={() => navigate(AppRoute.SOLUTION)} className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                         <Play size={24} className="text-white fill-current ml-1" />
                      </button>
                   </div>
                   <button className="absolute top-3 right-3 p-1.5 rounded-full bg-black/40 text-white hover:bg-blue-600 transition-colors">
                      <Star size={16} />
                   </button>
                   <span className="absolute bottom-3 right-3 text-xs font-mono bg-black/60 text-white px-1.5 py-0.5 rounded">
                      {lesson.duration}
                   </span>
                   <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-700">
                      <div className="h-full bg-blue-500" style={{ width: `${getProgress(lesson.id)}%` }}></div>
                   </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                   <h3 className="font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {lesson.title}
                   </h3>
                   <div className="mt-auto flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-50">
                      <div className="flex items-center gap-1">
                         <Clock size={14} /> 
                         {lesson.duration}
                      </div>
                      <div>
                         上次观看: {getWatchedTime(lesson.id).split(' ')[0]}
                      </div>
                   </div>
                </div>
             </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyVideos;