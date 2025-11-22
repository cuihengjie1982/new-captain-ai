
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppRoute, User } from '../types';
import { Video, FileText, Settings, Zap, Check, ArrowUpRight, X, QrCode, CheckCircle, Loader2 } from 'lucide-react';
import { getPaymentQRCode } from '../services/contentService';
import { updateUserPlan } from '../services/userDataService';

const Plans: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success'>('idle');

  useEffect(() => {
    const stored = localStorage.getItem('captainUser');
    if (stored) setUser(JSON.parse(stored));
    setQrCode(getPaymentQRCode());
  }, []);

  const handleUpgrade = () => {
    if (!user) {
      alert('请先登录');
      navigate(AppRoute.LOGIN);
      return;
    }
    setShowPaymentModal(true);
  };

  const simulatePaymentSuccess = () => {
    setPaymentStatus('processing');
    
    // Simulate network delay
    setTimeout(() => {
      if (user) {
        updateUserPlan(user.id, 'pro');
        
        // Update local state immediately
        const updatedUser = { ...user, plan: 'pro' as const };
        localStorage.setItem('captainUser', JSON.stringify(updatedUser));
        setUser(updatedUser);
        
        setPaymentStatus('success');
        
        setTimeout(() => {
          setShowPaymentModal(false);
          alert('恭喜！您已成功升级为 PRO 会员');
          navigate(AppRoute.MY_VIDEOS);
        }, 1500);
      }
    }, 2000);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto relative">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-900">订阅计划</h1>
        <p className="text-slate-500 mt-2">
          {user?.plan === 'pro' ? '您目前已是尊贵的 PRO 会员' : '您目前使用的是免费套餐。升级以解锁更多功能。'}
        </p>
      </header>

      {/* Sub Navigation */}
      <div className="flex gap-1 border-b border-slate-200 mb-12 overflow-x-auto justify-center">
        <Link to={AppRoute.MY_VIDEOS} className="px-4 py-2 border-b-2 border-transparent text-slate-500 hover:text-slate-700 flex items-center gap-2">
          <Video size={18} /> 视频
        </Link>
        <Link to={AppRoute.MY_NOTES} className="px-4 py-2 border-b-2 border-transparent text-slate-500 hover:text-slate-700 flex items-center gap-2">
          <FileText size={18} /> 笔记
        </Link>
        <Link to={AppRoute.PLANS} className="px-4 py-2 border-b-2 border-blue-600 text-blue-600 font-medium flex items-center gap-2">
          <Zap size={18} /> 升级计划
        </Link>
        <Link to={AppRoute.SETTINGS} className="px-4 py-2 border-b-2 border-transparent text-slate-500 hover:text-slate-700 flex items-center gap-2">
          <Settings size={18} /> 设置
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
         
         {/* Basic Plan */}
         <div className={`bg-slate-50 rounded-3xl p-8 border flex flex-col ${!user || user?.plan === 'free' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'}`}>
            <h3 className="text-2xl font-bold text-slate-900 mb-6">免费版</h3>
            
            <div className="mb-8">
               <h2 className="text-4xl font-bold text-slate-900 mb-2">¥0</h2>
               <p className="text-slate-500 text-sm">永久免费，适合个人学习</p>
            </div>

            <ul className="space-y-4 mb-8 flex-1">
               <li className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <Video size={18} /> 基础视频课程
               </li>
               <li className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <Zap size={18} /> AI 博客助手 (有限)
               </li>
               <li className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <Check size={18} /> 基础笔记功能
               </li>
            </ul>

            <button disabled={true} className="w-full py-3 bg-slate-200 text-slate-500 font-bold rounded-xl cursor-default">
               {!user || user?.plan === 'free' ? '当前计划' : '已包含'}
            </button>
         </div>

         {/* Pro Plan */}
         <div className={`bg-blue-50/50 rounded-3xl p-8 border flex flex-col relative overflow-hidden ${user?.plan === 'pro' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-blue-100'}`}>
            <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
               推荐
            </div>
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-2xl font-bold text-slate-900">专业版 PRO</h3>
            </div>
            
            <div className="mb-8">
               <div className="flex items-baseline gap-2">
                  <h2 className="text-4xl font-bold text-slate-900">¥199</h2>
                  <span className="text-slate-500">/ 年</span>
               </div>
            </div>

            <ul className="space-y-4 mb-8 flex-1">
               <li className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <Video size={18} /> 解锁全部 50+ 高级课程
               </li>
               <li className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <Zap size={18} /> 专家级 AI 诊断与方案
               </li>
               <li className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <ArrowUpRight size={18} /> 导出课程字幕与PPT
               </li>
               <li className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <FileText size={18} /> 无限下载专业报表模版
               </li>
               <li className="text-blue-600 text-sm font-medium pl-1 pt-2">
                  <span className="flex items-center gap-1">
                     <ArrowUpRight size={14} /> 优先人工专家支持通道
                  </span>
               </li>
            </ul>

            <button 
               onClick={handleUpgrade}
               disabled={user?.plan === 'pro'}
               className={`w-full py-3 rounded-xl font-bold transition-colors shadow-lg ${user?.plan === 'pro' ? 'bg-green-500 text-white shadow-green-200' : 'bg-slate-900 text-white hover:bg-black shadow-slate-900/20'}`}
            >
               {user?.plan === 'pro' ? '已激活 PRO 会员' : '立即升级'}
            </button>
         </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="font-bold text-slate-900">升级支付</h3>
                    <button onClick={() => setShowPaymentModal(false)} className="p-1 hover:bg-slate-100 rounded-full"><X size={20} /></button>
                </div>
                
                <div className="p-8 flex flex-col items-center text-center">
                    {paymentStatus === 'success' ? (
                        <div className="py-8 flex flex-col items-center animate-in zoom-in">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4">
                                <CheckCircle size={48} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">支付成功！</h3>
                            <p className="text-slate-500">正在为您配置 PRO 权益...</p>
                        </div>
                    ) : paymentStatus === 'processing' ? (
                        <div className="py-8 flex flex-col items-center">
                            <Loader2 size={48} className="text-blue-600 animate-spin mb-4" />
                            <p className="text-slate-500 font-bold">正在确认支付结果...</p>
                        </div>
                    ) : (
                        <>
                            <p className="text-sm text-slate-500 mb-4">请使用微信或支付宝扫码支付</p>
                            <div className="bg-white p-2 border border-slate-200 rounded-xl shadow-inner mb-6">
                                {qrCode ? (
                                    <img src={qrCode} alt="Payment QR" className="w-48 h-48 object-contain" />
                                ) : (
                                    <div className="w-48 h-48 bg-slate-100 flex flex-col items-center justify-center text-slate-400 rounded-lg">
                                        <QrCode size={48} className="mb-2 opacity-50" />
                                        <span className="text-xs">暂未配置收款码</span>
                                        <span className="text-[10px]">(请联系管理员)</span>
                                    </div>
                                )}
                            </div>
                            <div className="w-full">
                                <div className="text-2xl font-bold text-slate-900 mb-6">¥199.00</div>
                                <button 
                                    onClick={simulatePaymentSuccess}
                                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30"
                                >
                                    我已完成支付
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default Plans;
