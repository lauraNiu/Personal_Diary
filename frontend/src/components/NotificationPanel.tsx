import { useStore } from '../store';
import { useEffect, useState } from 'react';
import { Notifications as NotificationsAPI } from '../api';
import type { Notification } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell } from 'lucide-react';
import dayjs from 'dayjs';

export function NotificationPanel() {
  const { notificationPanelOpen, toggleNotificationPanel } = useStore();
  const [items, setItems] = useState<Notification[]>([]);

  useEffect(() => {
    if (notificationPanelOpen) NotificationsAPI.list().then(setItems);
  }, [notificationPanelOpen]);

  const readAll = async () => {
    await NotificationsAPI.readAll();
    setItems(items.map(i => ({ ...i, is_read: 1 })));
  };

  return (
    <AnimatePresence>
      {notificationPanelOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/30 z-40" onClick={toggleNotificationPanel} />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                      transition={{ type: 'spring', damping: 30, stiffness: 320 }}
                      className="fixed right-0 top-0 bottom-0 w-96 bg-white dark:bg-slate-900
                                 border-l border-slate-200 dark:border-slate-800 z-50 overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-900 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="font-semibold flex items-center gap-2"><Bell className="w-4 h-4" /> 通知</div>
              <div className="flex items-center gap-2">
                <button className="text-xs text-indigo-500" onClick={readAll}>全部已读</button>
                <button className="btn-icon" onClick={toggleNotificationPanel}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-sm">
                  <Bell className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  没有通知
                </div>
              )}
              {items.map(n => (
                <div key={n.id} className={`px-4 py-3 ${n.is_read ? 'opacity-60' : ''}`}>
                  <div className="text-sm font-medium">{n.title}</div>
                  {n.body && <div className="text-xs text-slate-500 mt-0.5">{n.body}</div>}
                  <div className="text-[10px] text-slate-400 mt-1">{dayjs(n.created_at).fromNow()}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
