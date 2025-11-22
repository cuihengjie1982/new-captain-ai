
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppRoute, BlogPost, ReadArticle } from '../types';
import { Search, Video, FileText, Settings, Zap, BookOpen, Clock, ArrowRight } from 'lucide-react';
import { getBlogPosts } from '../services/contentService';
import { getReadHistory } from '../services/userDataService';

const MyArticles: React.FC = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [history, setHistory] = useState<ReadArticle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setPosts(getBlogPosts());
    setHistory(getReadHistory());
  }, []);

  // Filter posts that are in history
  const readPosts = posts.filter(p => history.some(h => h.articleId === p.id));
  
  const filteredPosts = readPosts.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getReadDate = (id: string) => {
    const item = history.find(h => h.articleId === id);
    return item ? item.readAt : '';
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">我学习过的文章</h1>
        <p className="text-slate-500 mt-2">管理您的阅读历史和学习进度。</p>
      </header>

      {/* Sub Navigation */}
      <div className="flex gap-1 border-b border-slate-200 mb-8 overflow-x-auto">
        <Link to={AppRoute.MY_VIDEOS} className="px-4 py-2 border-b-2 border-transparent text-slate-500 hover:text-slate-700 flex items-center gap-2">
          <Video size={18} /> 视频
        </Link>
        <Link to={AppRoute.MY_ARTICLES} className="px-4 py-2 border-b-2 border-blue-600 text-blue-600 font-medium flex items-center gap-2">
          <BookOpen size={18} /> 文章
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
          placeholder="搜索已读文章..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-full focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
        />
      </div>

      {filteredPosts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen size={32} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-medium text-slate-700">暂无阅读记录</h3>
          <p className="text-slate-400 mt-1 mb-4">前往博客与洞察阅读您的第一篇文章</p>
          <Link to={AppRoute.BLOG} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            浏览文章
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map(post => (
             <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all group flex flex-col">
                <div className="h-40 overflow-hidden relative">
                   <img src={post.thumbnail} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                   <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                     <span className="text-white text-xs font-medium flex items-center gap-1">
                        <Clock size={12} /> {post.readTime}
                     </span>
                   </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                   <h3 className="font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {post.title}
                   </h3>
                   <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">
                      {post.summary}
                   </p>
                   
                   <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                      <span className="text-xs text-slate-400">上次阅读: {getReadDate(post.id)}</span>
                      <button 
                        onClick={() => navigate(`/blog/${post.id}`)}
                        className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline"
                      >
                        重温 <ArrowRight size={14} />
                      </button>
                   </div>
                </div>
             </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyArticles;
