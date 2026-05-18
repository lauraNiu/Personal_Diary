import { useEffect } from 'react';
import { useStore } from './store';
import { useAuth } from './auth';
import { AuthGate } from './components/AuthGate';
import { TooltipProvider } from './components/Tooltip';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { ViewTabs } from './components/ViewTabs';
import { TaskDetailPanel } from './components/TaskDetailPanel';
import { QuickCapture } from './components/QuickCapture';
import { CommandPalette } from './components/CommandPalette';
import { HelpPanel } from './components/HelpPanel';
import { NotificationPanel } from './components/NotificationPanel';
import { KanbanView } from './views/KanbanView';
import { GanttView } from './views/GanttView';
import { CalendarView } from './views/CalendarView';
import { MeetingsView } from './views/MeetingsView';
import { StatsView } from './views/StatsView';
import { EisenhowerView } from './views/EisenhowerView';
import { CapacityView } from './views/CapacityView';
import { HeatmapView } from './views/HeatmapView';
import { CollaboratorView } from './views/CollaboratorView';
import { PaperHubView } from './views/PaperHubView';
import { FocusView } from './views/FocusView';
import { Toaster } from 'react-hot-toast';

const VIEWS = [
  KanbanView, GanttView, CalendarView, MeetingsView, StatsView, EisenhowerView,
  CapacityView, HeatmapView, CollaboratorView, PaperHubView, FocusView,
];
const VIEW_NAMES = ['kanban', 'gantt', 'calendar', 'meetings', 'stats', 'eisenhower',
                    'capacity', 'heatmap', 'collaborator', 'paper', 'focus'] as const;

export default function App() {
  const {
    loadAll, currentView, darkMode,
    toggleQuickCapture, toggleCommandPalette, toggleHelpPanel,
    toggleSidebar, setCurrentView, openTaskDetail,
  } = useStore();
  const user = useAuth(s => s.user);

  // 登录后再加载业务数据
  useEffect(() => { if (user) loadAll(); }, [user?.id]);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA';
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === 'k') { e.preventDefault(); toggleCommandPalette(); return; }
      if (meta && e.key === '/') { e.preventDefault(); toggleHelpPanel(); return; }
      if (meta && e.key === '[') { e.preventDefault(); toggleSidebar(); return; }
      if (meta && /^[1-9]$/.test(e.key)) {
        const i = parseInt(e.key) - 1;
        if (VIEW_NAMES[i]) { e.preventDefault(); setCurrentView(VIEW_NAMES[i]); }
        return;
      }
      if (inInput) return;
      if (e.key === 'q' || e.key === 'Q') { e.preventDefault(); toggleQuickCapture(); return; }
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); setCurrentView('focus'); return; }
      if (e.key === 'Escape') { openTaskDetail(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const idx = VIEW_NAMES.indexOf(currentView as any);
  const CurrentView = VIEWS[idx === -1 ? 0 : idx];

  return (
    <TooltipProvider>
      <Toaster position="bottom-right"
               toastOptions={{
                 className: 'dark:bg-slate-800 dark:text-slate-100',
                 duration: 2500,
               }} />
      <AuthGate>
        <div className="h-full flex flex-col">
          <TopNav />
          <div className="flex-1 flex overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col overflow-hidden">
              {currentView !== 'focus' && <ViewTabs />}
              <div className="flex-1 overflow-hidden">
                <CurrentView />
              </div>
            </main>
          </div>

          <TaskDetailPanel />
          <QuickCapture />
          <CommandPalette />
          <HelpPanel />
          <NotificationPanel />
        </div>
      </AuthGate>
    </TooltipProvider>
  );
}
