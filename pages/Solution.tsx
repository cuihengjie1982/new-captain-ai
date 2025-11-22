
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppRoute, Lesson } from '../types';
import { Search, Play, Clock, Star, MoreHorizontal, Users, CalendarClock, ShieldCheck, TrendingUp, LayoutGrid, Activity, BookOpen } from 'lucide-react';
import { getLessons } from '../services/courseService';

const Solution: React.FC = () => {
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    const data = getLessons();
    setLessons(data);
  }, []);

  // Dynamically extract unique categories
  const uniqueCategories = Array.from(new Set(lessons.map(l => l.category).filter(Boolean))) as string[];
  
  // Build category tabs with icons (fallback to BookOpen if unknown)
  const categories = [
    { id: 'all', name: '全部课程', icon: LayoutGrid },
    ...uniqueCategories.map(cat => {
        // Try to match known categories to icons
        let icon = BookOpen;
        if (cat.includes('人员') || cat.includes('管理')) icon = Users;
        else if (cat.includes('WFM') || cat.includes('排班')) icon = CalendarClock;
        else if (cat.includes('质量') || cat.includes('体验')) icon = ShieldCheck;
        else if (cat.includes('效率')) icon = TrendingUp;
        else if (cat.includes('满意度') || cat.includes('客户')) icon = Activity;
        
        return {
            id: cat,
            name: cat,
            icon: icon
        };
    })
  ];

  const filteredLessons = lessons.filter(l => {
    const matchesSearch = l.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || l.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleLessonClick = (id: string) => {
    navigate(AppRoute.SOLUTION_DETAIL.replace(':id', id));
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto min-h-full flex flex-col">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">解决方案库</h1>
        <p className="text-slate-500 mt-2">专为呼叫中心设计的运营实战视频课程与案例库</p>
      </header>

      {/* Search and Filter Container */}
      <div className="flex flex-col gap-6 mb-10">
        
        {/* Search Bar */}
        <div className="relative w-full max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="搜索课程关键词，如“留存”、“排班”..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
          {categories.map(category => {
            const isActive = activeCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap border ${
                  isActive 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md transform scale-105' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <category.icon size={16} className={isActive ? 'text-blue-400' : 'text-slate-400'} />
                {category.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Summary */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          {activeCategory === 'all' ? '所有课程' : activeCategory}
          <span className="text-xs font-normal bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
            {filteredLessons.length}
          </span>
        </h2>
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredLessons.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <div className="text-slate-400 mb-2">该分类下暂无课程</div>
            <button onClick={() => setActiveCategory('all')} className="text-blue-600 font-bold hover:underline">
              查看全部
            </button>
          </div>
        ) : (
          filteredLessons.map((lesson) => (
            <div 
              key={lesson.id}
              onClick={() => handleLessonClick(lesson.id)}
              className="bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-blue-400 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col h-full relative"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-slate-100 overflow-hidden">
                <img 
                  src={lesson.thumbnail} 
                  alt={lesson.title} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                
                {/* Duration Badge */}
                <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md font-mono flex items-center gap-1">
                  <Clock size={10} /> {lesson.duration}
                </div>

                {/* Play Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                   <div className="w-12 h-12 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform">
                     <Play size={20} className="text-blue-600 fill-current ml-1" />
                   </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-3">
                   {/* Category Badge */}
                   {lesson.category ? (
                     <span className="inline-block px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                       {lesson.category}
                     </span>
                   ) : (
                     <span className="inline-block px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
                       视频课程
                     </span>
                   )}
                   
                   <button className="text-slate-300 hover:text-slate-500 p-1 rounded-full hover:bg-slate-50">
                     <MoreHorizontal size={16} />
                   </button>
                </div>
                
                <h3 className="font-bold text-slate-900 leading-tight mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">
                  {lesson.title}
                </h3>

                <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                     <Star size={12} className="text-yellow-400 fill-current" />
                     <span>4.9</span>
                  </div>
                  <span className="text-blue-600 font-medium group-hover:underline flex items-center gap-1">
                    开始学习
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Solution;
