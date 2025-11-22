
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AppRoute, User } from '../types';
import { 
  LayoutDashboard, 
  Compass, 
  BookOpen, 
  Anchor, 
  LogOut,
  Ship,
  Settings,
  UserCircle,
  Bell,
  ChevronDown,
  User as UserIcon,
  Crown
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('captainUser');
    if (stored) {
      setUser(JSON.parse(stored));
    } else {
      setUser(null);
    }
  }, [location]);

  if (location.pathname === AppRoute.LOGIN) {
    return <>{children}</>;
  }

  const handleLogout = () => {
    localStorage.removeItem('captainUser');
    setUser(null);
    setIsUserMenuOpen(false);
    navigate(AppRoute.LOGIN);
  };

  const navItems = [
    { path: AppRoute.BLOG, label: '博客与洞察', icon: BookOpen },
    { path: AppRoute.DIAGNOSIS, label: '诊断罗盘', icon: Compass },
    { path: AppRoute.SOLUTION, label: '解决方案库', icon: Anchor },
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
        
        {/* Removed bottom Login/Logout link as requested, now in Header */}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Header for Auth */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-end px-6 gap-4 flex-shrink-0 z-20">
            <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <Bell size={20} />
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
      </main>
    </div>
  );
};

export default Layout;
