
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AppRoute, User, BusinessContactInfo } from '../types';
import {
  LayoutDashboard,
  Compass,
  BookOpen,
  Anchor,
  LogOut,
  Ship,
  Settings,
  UserCircle,
  ChevronDown,
  User as UserIcon,
  Crown,
  Briefcase,
  X,
  Building2,
  Smartphone,
  Mail,
  Check,
  QrCode,
  Image,
  MessageSquare
} from 'lucide-react';
import { getPaymentQRCode, getBusinessContactInfo } from '../services/contentService';
import { saveBusinessLead } from '../services/userDataService';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Business Contact Modal State
  const [showContactModal, setShowContactModal] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [businessInfo, setBusinessInfo] = useState<BusinessContactInfo | null>(null);
  const [contactForm, setContactForm] = useState({ name: '', position: '', company: '', phone: '', email: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('captainUser');
    if (stored) {
      setUser(JSON.parse(stored));
    } else {
      setUser(null);
    }
    
    // Load Business Info
    setQrCode(getPaymentQRCode());
    setBusinessInfo(getBusinessContactInfo());
  }, [location]);

  // Pre-fill form when user logs in or modal opens
  useEffect(() => {
     if (showContactModal && user) {
         setContactForm(prev => ({
             ...prev,
             name: user.name,
             email: user.email || '',
             phone: user.phone || ''
         }));
     }
     if (!showContactModal) {
         setIsSubmitted(false);
     }
  }, [showContactModal, user]);

  const handleLogout = () => {
    localStorage.removeItem('captainUser');
    setUser(null);
    setIsUserMenuOpen(false);
    navigate(AppRoute.LOGIN);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
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

  if (location.pathname === AppRoute.LOGIN) {
    return <>{children}</>;
  }

  const navItems = [
    { path: AppRoute.BLOG, label: '博客与洞察', icon: BookOpen },
    { path: AppRoute.DIAGNOSIS, label: '诊断罗盘', icon: Compass },
    { path: AppRoute.SOLUTION, label: '解决方案库', icon: Anchor },
    { path: '/community', label: '知识社区', icon: MessageSquare },
    { path: AppRoute.DASHBOARD, label: '指挥中心', icon: LayoutDashboard },
    { path: AppRoute.MY_VIDEOS, label: '个人中心', icon: UserCircle },
  ];

  if (user?.role === 'admin') {
    navItems.push({ path: AppRoute.ADMIN, label: '后台管理', icon: Settings });
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl z-10">
        <div className="p-6 flex items-center gap-3 border-b border-slate-700">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Ship size={24} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">Captain AI</h1>
            <p className="text-xs text-slate-400">呼叫中心智能副驾</p>
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1">
          {navItems.map((item) => {
            const isUserCenter = item.path === AppRoute.MY_VIDEOS && [
               AppRoute.MY_VIDEOS, AppRoute.MY_NOTES, AppRoute.SETTINGS, AppRoute.PLANS
            ].includes(location.pathname as AppRoute);
            const isActive = location.pathname === item.path || isUserCenter;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Header for Auth */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-end px-6 gap-4 flex-shrink-0 z-20">
            <button 
                onClick={() => setShowContactModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-bold"
            >
                <Briefcase size={18} />
                <span>商务对接</span>
            </button>
            
            <div className="h-8 w-px bg-slate-200 mx-2"></div>

            {user ? (
                <div className="relative">
                    <button 
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        className="flex items-center gap-3 p-1 pl-3 hover:bg-slate-50 rounded-full transition-colors border border-transparent hover:border-slate-200"
                    >
                        <div className="text-right hidden md:block">
                            <div className="text-sm font-bold text-slate-700">{user.name}</div>
                            <div className="text-xs text-slate-500">{user.plan === 'pro' ? 'Pro Member' : 'Free Plan'}</div>
                        </div>
                        <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 relative border-2 border-white shadow-sm">
                            <UserIcon size={18} />
                            {user.plan === 'pro' && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center border border-white" title="Pro User">
                                    <Crown size={8} className="text-yellow-900 fill-current" />
                                </div>
                            )}
                        </div>
                        <ChevronDown size={16} className="text-slate-400 mr-1" />
                    </button>

                    {isUserMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 overflow-hidden animate-in fade-in zoom-in-95 z-50">
                            <Link 
                                to={AppRoute.MY_VIDEOS} 
                                className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600"
                                onClick={() => setIsUserMenuOpen(false)}
                            >
                                <UserCircle size={16} /> 个人中心
                            </Link>
                            <Link 
                                to={AppRoute.PLANS} 
                                className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600"
                                onClick={() => setIsUserMenuOpen(false)}
                            >
                                <Crown size={16} className="text-yellow-500" /> 升级订阅
                            </Link>
                            <Link 
                                to={AppRoute.SETTINGS} 
                                className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600"
                                onClick={() => setIsUserMenuOpen(false)}
                            >
                                <Settings size={16} /> 账户设置
                            </Link>
                            <div className="h-px bg-slate-100 my-1"></div>
                            <button 
                                onClick={handleLogout}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                            >
                                <LogOut size={16} /> 退出登录
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <Link 
                    to={AppRoute.LOGIN} 
                    className="px-5 py-2 bg-blue-600 text-white rounded-full text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 flex items-center gap-2"
                >
                    注册 / 登录
                </Link>
            )}
        </header>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto relative">
            {children}
        </div>

        {/* Business Contact Modal */}
        {showContactModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 relative transition-all flex flex-col md:flex-row">
                
                <button onClick={() => setShowContactModal(false)} className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full z-10"><X size={20} /></button>

                {/* Left Side: Form */}
                <div className="w-full md:w-1/2 p-8 flex flex-col">
                   <h3 className="font-bold text-xl text-slate-900 mb-6">{isSubmitted ? '提交成功' : '商务对接'}</h3>
                   
                   {!isSubmitted ? (
                       <form onSubmit={handleSubmitForm} className="space-y-4 flex-1">
                           <p className="text-sm text-slate-500 mb-6">
                              请填写您的联系信息，我们的商务团队将尽快与您联系。
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
                               <label className="block text-xs font-bold text-slate-500 mb-1">电子邮箱</label>
                               <div className="relative">
                                   <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                   <input 
                                       type="email" 
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
                               提交信息
                           </button>
                       </form>
                   ) : (
                       <div className="flex flex-col items-center justify-center h-full text-center py-10">
                           <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                               <Check size={32} />
                           </div>
                           <h4 className="text-xl font-bold text-slate-900 mb-2">提交成功</h4>
                           <p className="text-slate-500 mb-8">
                               请查看右侧扫码添加商务经理企业微信。
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
                    {businessInfo && (
                        <div className="space-y-2">
                            <h4 className="font-bold text-slate-900 text-lg">扫码添加商务经理</h4>
                            <p className="text-sm text-slate-500">专属顾问：{businessInfo.contactPerson}</p>
                            <p className="text-sm text-slate-500">电话/微信：{businessInfo.contactMethod}</p>
                        </div>
                    )}
                    <div className="mt-8 text-xs text-slate-400 max-w-xs">
                        提交左侧表单后，我们将为您分配专属客户经理，并提供定制化演示服务。
                    </div>
                </div>

            </div>
        </div>
      )}
      </main>
    </div>
  );
};

export default Layout;
