

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppRoute, User, BusinessContactInfo, PlansPageConfig, PlanFeature } from '../types';
import { Video, FileText, Settings, Zap, Check, ArrowUpRight, X, QrCode, Mail, Phone, User as UserIcon, Building2, Smartphone, Briefcase, Image, Star } from 'lucide-react';
import { getPaymentQRCode, getBusinessContactInfo, getPlansPageConfig } from '../services/contentService';
import { saveBusinessLead } from '../services/userDataService';

const Plans: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [businessInfo, setBusinessInfo] = useState<BusinessContactInfo | null>(null);
  const [plansConfig, setPlansConfig] = useState<PlansPageConfig | null>(null);
  
  // Form State
  const [contactForm, setContactForm] = useState({ name: '', position: '', company: '', phone: '', email: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('captainUser');
    if (stored) {
        const u = JSON.parse(stored);
        setUser(u);
        // Pre-fill form if user data exists
        setContactForm(prev => ({
            ...prev,
            name: u.name || '',
            email: u.email || '',
            phone: u.phone || ''
        }));
    }
    setQrCode(getPaymentQRCode());
    setBusinessInfo(getBusinessContactInfo());
    setPlansConfig(getPlansPageConfig());
  }, []);

  // Reset form state when modal closes
  useEffect(() => {
      if(!showContactModal) {
          setIsSubmitted(false);
      }
  }, [showContactModal]);

  const handleUpgrade = () => {
    if (!user) {
      alert('请先登录');
      navigate(AppRoute.LOGIN);
      return;
    }
    setShowContactModal(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.phone || !contactForm.company || !contactForm.email || !contactForm.position) {
        return; // HTML5 validation handles display, this is a safeguard
    }

    saveBusinessLead({
        id: Date.now().toString(),
        name: contactForm.name,
        position: contactForm.position,
        company: contactForm.company,
        phone: contactForm.phone,
        email: contactForm.email,
        submittedAt: new Date().toLocaleString('zh-CN'),
        status: 'new'
    });

    setIsSubmitted(true);
  };

  const getIcon = (iconName: string) => {
      switch(iconName) {
          case 'Video': return <Video size={18} />;
          case 'Zap': return <Zap size={18} />;
          case 'Check': return <Check size={18} />;
          case 'ArrowUpRight': return <ArrowUpRight size={18} />;
          case 'FileText': return <FileText size={18} />;
          case 'Star': return <Star size={18} />;
          default: return <Check size={18} />;
      }
  };

  if (!plansConfig) return null;

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
               <h2 className="text-4xl font-bold text-slate-900 mb-2">{plansConfig.free.title}</h2>
               <p className="text-slate-500 text-sm">{plansConfig.free.subtitle}</p>
            </div>

            <ul className="space-y-4 mb-8 flex-1">
               {plansConfig.free.features.map((feature, idx) => (
                   <li key={idx} className="flex items-center gap-3 text-sm font-medium text-slate-700">
                      {getIcon(feature.icon)} {feature.text}
                   </li>
               ))}
            </ul>

            <button disabled={true} className="w-full py-3 bg-slate-200 text-slate-500 font-bold rounded-xl cursor-default">
               {!user || user?.plan === 'free' ? plansConfig.free.buttonText : '已包含'}
            </button>
         </div>

         {/* Pro Plan */}
         <div className={`bg-blue-50/50 rounded-3xl p-8 border flex flex-col relative overflow-hidden ${user?.plan === 'pro' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-blue-100'}`}>
            <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
               推荐
            </div>
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-2xl font-bold text-slate-900">专业版</h3>
            </div>
            
            <div className="mb-8">
               <div className="flex items-baseline gap-2">
                  <h2 className="text-2xl font-bold text-slate-900">{plansConfig.pro.title}</h2>
               </div>
               <p className="text-slate-500 text-sm mt-2">{plansConfig.pro.subtitle}</p>
            </div>

            <ul className="space-y-4 mb-8 flex-1">
               {plansConfig.pro.features.map((feature, idx) => (
                   <li key={idx} className="flex items-center gap-3 text-sm font-medium text-slate-700">
                      {getIcon(feature.icon)} {feature.text}
                   </li>
               ))}
            </ul>

            <button 
               onClick={handleUpgrade}
               disabled={user?.plan === 'pro'}
               className={`w-full py-3 rounded-xl font-bold transition-colors shadow-lg ${user?.plan === 'pro' ? 'bg-green-500 text-white shadow-green-200' : 'bg-slate-900 text-white hover:bg-black shadow-slate-900/20'}`}
            >
               {user?.plan === 'pro' ? '已激活 PRO 会员' : plansConfig.pro.buttonText}
            </button>
         </div>
      </div>

      {/* Contact Modal - Redesigned Side-by-Side */}
      {showContactModal && businessInfo && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 relative transition-all flex flex-col md:flex-row">
                
                {/* Close Button (Absolute) */}
                <button onClick={() => setShowContactModal(false)} className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full z-10"><X size={20} /></button>

                {/* Left Side: Form */}
                <div className="w-full md:w-1/2 p-8 flex flex-col">
                   <h3 className="font-bold text-xl text-slate-900 mb-6">{isSubmitted ? '提交成功' : '填写联系信息'}</h3>
                   
                   {!isSubmitted ? (
                       <form onSubmit={handleSubmitForm} className="space-y-4 flex-1">
                           <p className="text-sm text-slate-500 mb-6">
                              请填写您的真实信息，所有字段均为必填。提交后即可获取商务经理二维码。
                           </p>

                           <div>
                               <label className="block text-xs font-bold text-slate-500 mb-1">您的姓名 <span className="text-red-500">*</span></label>
                               <div className="relative">
                                   <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                   <input 
                                       type="text" 
                                       required
                                       value={contactForm.name}
                                       onChange={e => setContactForm({...contactForm, name: e.target.value})}
                                       className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                       placeholder="请输入姓名"
                                   />
                               </div>
                           </div>

                           <div>
                               <label className="block text-xs font-bold text-slate-500 mb-1">职位头衔 <span className="text-red-500">*</span></label>
                               <div className="relative">
                                   <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                   <input 
                                       type="text" 
                                       required
                                       value={contactForm.position}
                                       onChange={e => setContactForm({...contactForm, position: e.target.value})}
                                       className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                       placeholder="例如：运营总监"
                                   />
                               </div>
                           </div>

                           <div>
                               <label className="block text-xs font-bold text-slate-500 mb-1">公司名称 <span className="text-red-500">*</span></label>
                               <div className="relative">
                                   <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                   <input 
                                       type="text" 
                                       required
                                       value={contactForm.company}
                                       onChange={e => setContactForm({...contactForm, company: e.target.value})}
                                       className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                       placeholder="请输入公司名称"
                                   />
                               </div>
                           </div>

                           <div>
                               <label className="block text-xs font-bold text-slate-500 mb-1">手机号码 <span className="text-red-500">*</span></label>
                               <div className="relative">
                                   <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                   <input 
                                       type="tel" 
                                       required
                                       value={contactForm.phone}
                                       onChange={e => setContactForm({...contactForm, phone: e.target.value})}
                                       className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                       placeholder="请输入手机号"
                                   />
                               </div>
                           </div>

                           <div>
                               <label className="block text-xs font-bold text-slate-500 mb-1">公司邮箱 <span className="text-red-500">*</span></label>
                               <div className="relative">
                                   <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                   <input 
                                       type="email" 
                                       required
                                       value={contactForm.email}
                                       onChange={e => setContactForm({...contactForm, email: e.target.value})}
                                       className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                       placeholder="name@company.com"
                                   />
                               </div>
                           </div>

                           <button 
                               type="submit"
                               className="w-full mt-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                           >
                               提交并获取联系方式
                           </button>
                       </form>
                   ) : (
                       <div className="flex flex-col items-center justify-center h-full text-center py-10">
                           <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                               <Check size={32} />
                           </div>
                           <h4 className="text-xl font-bold text-slate-900 mb-2">提交成功</h4>
                           <p className="text-slate-500 mb-8">
                               请查看右侧添加商务经理微信，备注“升级咨询”。
                           </p>
                           <button 
                               onClick={() => setShowContactModal(false)}
                               className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                           >
                               关闭窗口
                           </button>
                       </div>
                   )}
                </div>

                {/* Right Side: QR Code Area */}
                <div className="w-full md:w-1/2 bg-slate-50 border-l border-slate-100 p-8 flex flex-col items-center justify-center text-center relative">
                    {isSubmitted ? (
                        <div className="animate-in zoom-in duration-500">
                            <div className="bg-white p-4 rounded-2xl shadow-lg border border-slate-200 mb-6">
                                {qrCode ? (
                                    <img src={qrCode} alt="Business QR" className="w-48 h-48 object-contain" />
                                ) : (
                                    <div className="w-48 h-48 bg-slate-100 flex flex-col items-center justify-center text-slate-400 rounded-lg">
                                        <QrCode size={48} className="mb-2 opacity-50" />
                                        <span className="text-xs">暂未配置二维码</span>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-bold text-slate-900 text-lg">扫码添加商务</h4>
                                <p className="text-sm text-slate-500">专属顾问：{businessInfo.contactPerson}</p>
                                <p className="text-sm text-slate-500">微信号：{businessInfo.contactMethod}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="opacity-50">
                            <div className="w-48 h-48 bg-slate-200 rounded-2xl mb-6 mx-auto flex items-center justify-center">
                                <Image size={48} className="text-slate-400" />
                            </div>
                            <p className="text-slate-400 font-medium">提交表单后显示二维码</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
      )}

    </div>
  );
};

export default Plans;