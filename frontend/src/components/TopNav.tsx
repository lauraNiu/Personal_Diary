import { Bell, Search, Moon, Sun, Sparkles, LogOut } from 'lucide-react';
import { useStore } from '../store';
import { useAuth } from '../auth';
import { Tooltip } from './Tooltip';
import { useEffect, useState } from 'react';
import { Notifications as NotificationsAPI } from '../api';

export function TopNav() {
  const { darkMode, toggleDarkMode, toggleCommandPalette, toggleNotificationPanel } = useStore();
  const { user, logout } = useAuth();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const refresh = () => NotificationsAPI.list(true).then(arr => setUnread(arr.length)).catch(() => {});
    refresh();
    const t = setInterval(refresh, 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900
                       flex items-center justify-between px-4 gap-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-indigo-500" />
        <span className="font-semibold text-base">Personal Life OS</span>
      </div>

      <div className="flex-1 max-w-xl">
        <Tooltip title="全局搜索" desc="搜索任务、项目、协作者、论文" shortcut="⌘K">
          <button
            onClick={toggleCommandPalette}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md
                       bg-slate-100 dark:bg-slate-800 text-slate-500 text-sm
                       hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <Search className="w-4 h-4" />
            <span>搜索任何内容...</span>
            <kbd className="kbd ml-auto">⌘K</kbd>
          </button>
        </Tooltip>
      </div>

      <div className="flex items-center gap-1">
        <Tooltip title="切换主题" desc="深色/浅色模式">
          <button className="btn-icon" onClick={toggleDarkMode}>
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </Tooltip>
        <Tooltip title="通知中心" desc={unread > 0 ? `有 ${unread} 条未读` : '没有未读通知'}>
          <button className="btn-icon relative" onClick={toggleNotificationPanel}>
            <Bell className="w-4 h-4" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-[10px] flex items-center justify-center
                               bg-red-500 text-white rounded-full">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        </Tooltip>

        {user && (
          <div className="relative">
            <Tooltip title={user.name} desc={user.email}>
              <button onClick={() => setMenuOpen(o => !o)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-medium hover:ring-2 hover:ring-indigo-300 transition"
                      style={{ background: user.avatar_color }}>
                {user.name.charAt(0).toUpperCase()}
              </button>
            </Tooltip>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-10 z-40 w-56 card shadow-lg overflow-hidden">
                  <div className="px-3 py-3 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-full text-white"
                            style={{ background: user.avatar_color }}>
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{user.name}</div>
                        <div className="text-xs text-slate-500 truncate">{user.email}</div>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => { setMenuOpen(false); logout(); }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800
                                     flex items-center gap-2 text-red-500">
                    <LogOut className="w-4 h-4" /> 退出登录
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
