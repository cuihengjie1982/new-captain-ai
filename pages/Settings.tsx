
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AppRoute, User } from '../types';
import { Video, FileText, Settings as SettingsIcon, Zap, User as UserIcon, Mail, Lock, ToggleLeft, ToggleRight } from 'lucide-react';
import { getUserPlanLabel } from '../services/permissionService';

const Settings: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  
  useEffect(() => {
    const stored = localStorage.getItem('captainUser');
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);
      setName(u.name);
      setEmail(u.email || '');
    }
  }, []);

  const handleSave = () => {
    if (user) {
       const updated = { ...user, name, email };
       localStorage.setItem('captainUser', JSON.stringify(updated));
       setUser(updated);
       alert('设置已保存');
    }
  };

  // Simulation for plan switching
  const togglePlan = () => {
    if (user) {
      const newPlan: User['plan'] = user.plan === 'free' ? 'pro' : 'free';
      const updated = { ...user, plan: newPlan };
      localStorage.setItem('captainUser', JSON.stringify(updated));
      setUser(updated);
      // Need to force a refresh or notify layout, but for now local state update + localStorage is enough for subsequent navigations
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">设置</h1>
      </header>

      {/* Sub Navigation */}
      <div className="flex gap-1 border-b border-slate-200 mb-8 overflow-x-auto">
        <Link to={AppRoute.MY_VIDEOS} className="px-4 py-2 border-b-2 border-transparent text-slate-500 hover:text-slate-700 flex items-center gap-2">
          <Video size={18} /> 视频
        </Link>
        <Link to={AppRoute.MY_NOTES} className="px-4 py-2 border-b-2 border-transparent text-slate-500 hover:text-slate-700 flex items-center gap-2">
          <FileText size={18} /> 笔记
        </Link>
        <Link to={AppRoute.PLANS} className="px-4 py-2 border-b-2 border-transparent text-slate-500 hover:text-slate-700 flex items-center gap-2">
          <Zap size={18} /> 升级计划
        </Link>
        <Link to={AppRoute.SETTINGS} className="px-4 py-2 border-b-2 border-blue-600 text-blue-600 font-medium flex items-center gap-2">
          <SettingsIcon size={18} /> 设置
        </Link>
      </div>

      <div className="max-w-2xl space-y-8">
         
         {/* Subscription Card */}
         <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">订阅管理</h2>
                <p className="text-sm text-slate-500">当前会员等级：<span className="font-bold text-slate-800">{getUserPlanLabel(user)}</span></p>
              </div>
              
              {/* Plan Toggle Simulator */}
              {user && user.role !== 'admin' && (
                <div className="flex items-center gap-2">
                   <span className="text-xs text-slate-400">模拟切换:</span>
                   <button 
                     onClick={togglePlan}
                     className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${user.plan === 'pro' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}
                   >
                      {user.plan === 'pro' ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      {user.plan === 'pro' ? 'Pro' : 'Free'}
                   </button>
                </div>
              )}
            </div>
            
            <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between mb-4 border border-slate-100">
               <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${user?.plan === 'pro' ? 'bg-blue-200 text-blue-800' : 'bg-slate-200 text-slate-600'}`}>
                    {user?.plan === 'pro' ? '专业版' : '免费版'}
                  </span>
                  <span className="text-sm text-slate-500 flex items-center gap-1">
                     <Zap size={14} /> {user?.plan === 'pro' ? '已解锁全部高级功能' : '升级解锁高级功能'}
                  </span>
               </div>
            </div>
            
            <div className="mb-6">
               <div className="flex justify-between text-sm font-bold mb-2">
                  <span>功能使用配额</span>
                  <span>{user?.plan === 'pro' ? '无限' : '有限'}</span>
               </div>
               <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full w-1/3 ${user?.plan === 'pro' ? 'bg-blue-500' : 'bg-slate-400'}`}></div>
               </div>
            </div>

            <div className="flex gap-3">
               <Link to={AppRoute.PLANS} className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-black transition-colors">
                  {user?.plan === 'pro' ? '管理订阅' : '升级到专业版'}
               </Link>
            </div>
         </div>

         {/* Profile Card */}
         <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-1">个人资料</h2>
            <p className="text-sm text-slate-500 mb-6">更新您的个人信息和偏好设置。</p>
            
            <div className="space-y-6">
               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">电子邮件</label>
                  <div className="relative">
                     <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                     <input 
                       type="email" 
                       value={email} 
                       onChange={(e) => setEmail(e.target.value)}
                       className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                     />
                  </div>
               </div>

               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">姓名</label>
                  <div className="relative">
                     <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                     <input 
                       type="text" 
                       value={name}
                       onChange={(e) => setName(e.target.value)}
                       className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                     />
                  </div>
               </div>

               <div className="flex justify-end pt-2">
                  <button onClick={handleSave} className="px-6 py-2.5 bg-slate-500 text-white font-bold rounded-lg hover:bg-slate-600 transition-colors">
                     保存更改
                  </button>
               </div>
            </div>
         </div>

         {/* Password Card (Mock) */}
         <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-1">更改密码</h2>
            <p className="text-sm text-slate-500 mb-6">请更新新密码以确保您的账户安全。</p>
            
            <div className="space-y-4">
               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">新密码</label>
                  <input type="password" placeholder="输入新密码" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
               </div>
               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">确认新密码</label>
                  <input type="password" placeholder="确认新密码" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
               </div>
               <div className="flex justify-end pt-2">
                  <button className="px-6 py-2.5 bg-slate-500 text-white font-bold rounded-lg hover:bg-slate-600 transition-colors">
                     更新密码
                  </button>
               </div>
            </div>
         </div>

      </div>
    </div>
  );
};

export default Settings;
