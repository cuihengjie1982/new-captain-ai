

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppRoute, AdminNote } from '../types';
import { Search, Video, FileText, Settings, Zap, MessageSquare, Clock, BookOpen, Quote } from 'lucide-react';
import { getAdminNotes } from '../services/userDataService';

const MyNotes: React.FC = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'video' | 'article'>('all');

  useEffect(() => {
    const allNotes = getAdminNotes();
    // Filter notes by current user
    const currentUser = JSON.parse(localStorage.getItem('captainUser') || '{}');
    const myNotes = allNotes.filter(n => n.userName === (currentUser.name || 'Guest User'));
    setNotes(myNotes);
  }, []);

  const filteredNotes = notes.filter(n => {
    const matchesSearch = n.content.toLowerCase().includes(searchQuery.toLowerCase()) || n.lessonTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' 
        ? true 
        : filter === 'video' 
            ? (n.sourceType === 'video' || !n.sourceType) // Legacy notes assume video
            : n.sourceType === 'article';
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">我的笔记</h1>
        <p className="text-slate-500 mt-2">已保存 {notes.length} 条笔记</p>
      </header>

      {/* Sub Navigation */}
      <div className="flex gap-1 border-b border-slate-200 mb-8 overflow-x-auto">
        <Link to={AppRoute.MY_VIDEOS} className="px-4 py-2 border-b-2 border-transparent text-slate-500 hover:text-slate-700 flex items-center gap-2">
          <Video size={18} /> 视频
        </Link>
        <Link to={AppRoute.MY_ARTICLES} className="px-4 py-2 border-b-2 border-transparent text-slate-500 hover:text-slate-700 flex items-center gap-2">
          <BookOpen size={18} /> 文章
        </Link>
        <Link to={AppRoute.MY_NOTES} className="px-4 py-2 border-b-2 border-blue-600 text-blue-600 font-medium flex items-center gap-2">
          <FileText size={18} /> 笔记
        </Link>
        <Link to={AppRoute.PLANS} className="px-4 py-2 border-b-2 border-transparent text-slate-500 hover:text-slate-700 flex items-center gap-2">
          <Zap size={18} /> 升级计划
        </Link>
        <Link to={AppRoute.SETTINGS} className="px-4 py-2 border-b-2 border-transparent text-slate-500 hover:text-slate-700 flex items-center gap-2">
          <Settings size={18} /> 设置
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
         <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="搜索笔记内容或标题..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
         </div>
         
         <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="text-sm text-slate-500 mr-2">来源筛选:</span>
            <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>全部</button>
            <button onClick={() => setFilter('video')} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${filter === 'video' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                <Video size={14} /> 视频笔记
            </button>
            <button onClick={() => setFilter('article')} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${filter === 'article' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                <BookOpen size={14} /> 文章笔记
            </button>
         </div>
      </div>

      <div className="space-y-6">
         {filteredNotes.length === 0 ? (
            <div className="text-center py-12 text-slate-400">未找到相关笔记</div>
         ) : (
            filteredNotes.map(note => {
               const isArticle = note.sourceType === 'article';
               return (
               <div key={note.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                     <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden ${isArticle ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                        {isArticle ? <BookOpen size={24} /> : <Video size={24} />}
                     </div>
                     <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                           <h3 className="font-bold text-slate-900 flex items-center gap-2">
                               {note.lessonTitle}
                               {isArticle && <span className="text-[10px] bg-slate-100 px-1.5 rounded text-slate-500 border border-slate-200">文章</span>}
                           </h3>
                           <span className="text-xs text-slate-400">{note.userName}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                           <span className="flex items-center gap-1">
                               {isArticle ? <BookOpen size={12} /> : <Video size={12} />} 
                               {note.timestampDisplay || (isArticle ? '摘录' : '未知时间')}
                           </span>
                        </div>
                        
                        {note.quote && (
                            <div className="bg-slate-50 p-3 rounded-lg border-l-4 border-blue-300 mb-3">
                                <div className="flex items-center gap-1 mb-1">
                                    <Quote size={10} className="text-blue-400 fill-current" />
                                    <span className="text-[10px] font-bold text-blue-500 uppercase">原文引用</span>
                                </div>
                                <p className="text-xs text-slate-600 italic">“{note.quote}”</p>
                            </div>
                        )}

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                           {note.content}
                        </div>
                        
                        <div className="mt-4 text-xs text-slate-400 flex items-center gap-1">
                           <Clock size={12} /> {note.createdAt}
                           {note.sourceId && (
                             <Link to={isArticle ? `/blog/${note.sourceId}` : `/solution/${note.sourceId}`} className="ml-auto text-blue-600 hover:underline">
                                查看原文
                             </Link>
                           )}
                        </div>
                     </div>
                  </div>
               </div>
               );
            })
         )}
      </div>
    </div>
  );
};

export default MyNotes;