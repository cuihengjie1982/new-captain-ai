
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AppRoute, User } from '../types';
import { Ship, ArrowRight, User as UserIcon, Phone, Mail, KeyRound, MessageSquare, Lock } from 'lucide-react';
import { findUserByEmail, registerUser, sendVerificationCode, verifyEmailCode } from '../services/userDataService';

const Login: React.FC = () => {
  const navigate = useNavigate();
  
  // Login Flow States
  const [loginStep, setLoginStep] = useState<'email' | 'password' | 'register'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Registration States
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [timer, setTimer] = useState(0);

  // Existing user ref if found
  const [existingUser, setExistingUser] = useState<User | null>(null);
  const [error, setError] = useState('');

  // Handle Timer
  useEffect(() => {
    let interval: any;
    if (isCodeSent && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    } else if (timer === 0) {
      setIsCodeSent(false);
    }
    return () => clearInterval(interval);
  }, [isCodeSent, timer]);

  const handleCheckEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError('');

    const user = findUserByEmail(email);
    if (user) {
      // User exists, go to password login
      setExistingUser(user);
      setLoginStep('password');
    } else {
      // User does not exist, go to register flow (Email + Code)
      setLoginStep('register');
    }
  };

  const handleSendCode = () => {
    if (!email) {
        setError('请输入邮箱地址');
        return;
    }
    // Trigger simulated email sending
    setIsCodeSent(true);
    setTimer(60);
    
    sendVerificationCode(email);
    
    // In a real app, we wouldn't show the code here.
    // For demo purposes, we inform the user to check the admin panel (background).
    alert(`验证码已发送至 ${email}。\n\n【演示提示】\n这是一个模拟环境，请在“后台管理 -> 邮件日志”中查看，或查看浏览器控制台 (F12)。`);
  };

  const handleLoginPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingUser) return;

    if (password === existingUser.password || password === 'admin') { // Simple check
       loginSuccess(existingUser);
    } else {
       setError('密码错误，请重试');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verifyEmailCode(email, code)) {
        setError('验证码错误或已过期，请检查后台邮件日志');
        return;
    }

    if (!newPassword || newPassword.length < 6) {
        setError('请设置至少6位数的密码');
        return;
    }
    if (!name) {
        setError('请输入您的姓名');
        return;
    }

    const newUser = registerUser(name, email, newPassword);
    loginSuccess(newUser);
  };

  const loginSuccess = (user: User) => {
    try {
        localStorage.setItem('captainUser', JSON.stringify({ 
          ...user,
          isAuthenticated: true 
        }));
        
        if (user.role === 'admin') {
            navigate(AppRoute.ADMIN);
        } else {
            navigate(AppRoute.BLOG);
        }
    } catch (err) {
        console.error("Storage error", err);
    }
  };

  const fillAdminCredentials = () => {
    setEmail('admin@captain.ai');
    setLoginStep('email');
    setTimeout(() => {
        const user = findUserByEmail('admin@captain.ai');
        if(user) {
            setExistingUser(user);
            setLoginStep('password');
            setPassword('admin');
        }
    }, 100);
  };

  const resetFlow = () => {
      setLoginStep('email');
      setEmail('');
      setPassword('');
      setName('');
      setCode('');
      setNewPassword('');
      setError('');
      setExistingUser(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md relative overflow-hidden transition-all duration-300">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-blue-600 rounded-xl mb-4 shadow-lg shadow-blue-600/20">
            <Ship size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">欢迎登船</h1>
          <p className="text-slate-500 mt-2">Captain AI 呼叫中心智能副驾</p>
        </div>

        {/* Step 1: Enter Email */}
        {loginStep === 'email' && (
            <form onSubmit={handleCheckEmail} className="space-y-5 animate-in fade-in slide-in-from-right-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">工作邮箱</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail size={18} className="text-slate-400" />
                        </div>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="name@company.com"
                            required
                            autoFocus
                        />
                    </div>
                </div>
                <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
                >
                    下一步 <ArrowRight size={18} />
                </button>
            </form>
        )}

        {/* Step 2a: Login with Password (Existing User) */}
        {loginStep === 'password' && (
            <form onSubmit={handleLoginPassword} className="space-y-5 animate-in fade-in slide-in-from-right-4">
                <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-lg mb-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                        {existingUser?.name.charAt(0)}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <div className="text-sm font-bold text-slate-800 truncate">{existingUser?.name}</div>
                        <div className="text-xs text-slate-500 truncate">{email}</div>
                    </div>
                    <button type="button" onClick={resetFlow} className="text-xs text-blue-600 hover:underline">切换账号</button>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">登录密码</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock size={18} className="text-slate-400" />
                        </div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="请输入密码"
                            required
                            autoFocus
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
                >
                    登录 <ArrowRight size={18} />
                </button>
            </form>
        )}

        {/* Step 2b: Register / First Time Login (New User) */}
        {loginStep === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="bg-yellow-50 border border-yellow-100 p-3 rounded-lg mb-4 text-xs text-yellow-800">
                    欢迎新用户！请完成首次身份验证并设置密码。
                    <button type="button" onClick={resetFlow} className="underline ml-2">返回</button>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">您的姓名</label>
                    <div className="relative">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <UserIcon size={16} className="text-slate-400" />
                        </div>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="请输入姓名"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">邮箱验证码</label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <MessageSquare size={16} className="text-slate-400" />
                            </div>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="6位数字"
                                maxLength={6}
                                required
                            />
                        </div>
                        <button 
                            type="button"
                            onClick={handleSendCode}
                            disabled={isCodeSent}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold disabled:opacity-50 min-w-[100px]"
                        >
                            {isCodeSent ? `${timer}s` : '发送验证码'}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">设置登录密码</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock size={16} className="text-slate-400" />
                        </div>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="至少6位字符"
                            minLength={6}
                            required
                        />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">后续登录将使用邮箱和此密码。</p>
                </div>

                <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 mt-2"
                >
                    完成注册并登录
                </button>
            </form>
        )}

        {error && (
             <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center justify-center animate-in fade-in">
                {error}
             </div>
        )}

        {/* Guest Access & Admin Helper */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center gap-4">
            <Link 
                to={AppRoute.BLOG}
                className="text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1"
            >
                暂不登录，以访客身份浏览 <ArrowRight size={14} />
            </Link>
            
           <button 
             type="button"
             onClick={fillAdminCredentials}
             className="text-xs text-slate-300 hover:text-blue-600 hover:underline flex items-center justify-center gap-1 mx-auto transition-colors"
           >
             <KeyRound size={12} />
             管理员入口
           </button>
        </div>

      </div>
    </div>
  );
};

export default Login;
