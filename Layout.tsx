import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppRoute, User } from '../types';
import { 
  LayoutDashboard, 
  Compass, 
  BookOpen, 
  Anchor, 
  LogOut,
  Ship,
  Settings,
  UserCircle
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check user status on mount and whenever location changes
    // This ensures the sidebar updates immediately after login
    const stored = localStorage.getItem('captainUser');
    if (stored) {
      setUser(JSON.parse(stored));
    } else {
      setUser(null);
    }
  }, [location]);

  // Simple check to hide sidebar on login page
  if (location.pathname === AppRoute.LOGIN) {
    return <>{children}</>;
  }

  const navItems = [
    { path: AppRoute.BLOG, label: '博客与洞察', icon: BookOpen },
    { path: AppRoute.DIAGNOSIS, label: '诊断罗盘', icon: Compass },
    { path: AppRoute.SOLUTION, label: '解决方案库', icon: Anchor },
    { path: AppRoute.DASHBOARD, label: '指挥中心', icon: LayoutDashboard },
    // New User Center Menu
    { path: AppRoute.MY_VIDEOS, label: '个人中心', icon: UserCircle },
  ];

  // Admin menu item is pushed last
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
            // Active state logic: Check if path matches or if it's part of the User Center group
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

        <div className="p-4 border-t border-slate-800">
          <div className="mb-4 px-4 text-xs text-slate-500">
             当前用户: {user?.name || 'Guest'}
          </div>
          <Link 
            to={AppRoute.LOGIN}
            className="flex items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            onClick={() => {
              localStorage.removeItem('captainUser');
              setUser(null);
            }}
          >
            <LogOut size={18} />
            退出登录
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        {children}
      </main>
    </div>
  );
};

export default Layout;